# Looks de color (A/B): vibrante, soleado y toon frente al de fábrica

Pedido de Kelvin (25-oct): «los colores pueden mejorar y quizás debemos hacerlo más liviano; más a como los usa Fortnite».
Dirección de arte, no copia: color saturado y alegre, cielo azul intenso, sol cálido, sombras con tinte (no grises), menos
«realista gris», legible en un celular. **El look de fábrica no cambia**: Kelvin decide con las capturas.

## Cómo se ve cada look
- URL: `?look=vibrante`, `?look=soleado`, `?look=toon` (con `&tex=512` para probar texturas pequeñas en cualquier look).
- Pausa: sección «Look (prueba)», oculta; se ve con `?look=…` o con `localStorage['ave.look.dev'] = '1'`. Lo elegido vive en
  la sesión (sessionStorage), no en la partida.
- Para fijar uno de fábrica: `DEFECTO` en `src/game/look.js` (una línea: `null` → `'vibrante'`).

## Qué cambia cada look (todo en vivo, sin recargar; `src/game/look.js`)
| | Fábrica | Vibrante | Soleado | Toon |
|---|---|---|---|---|
| Gradación tras el ACES (sat · contraste · calidez) | post solo en alto: 1,08 · 1,04 | 1,30 · 1,08 · cálida | 1,15 · 1,05 · cálida | 1,35 · 1,10 · cálida |
| Exposición | 0,74 | 0,82 | 0,80 | 0,84 |
| Sol (color · intensidad) | #fff0d6 · 2,0 | #ffe6b8 · 2,2 | #ffe9c0 · 2,15 | #ffe6b8 · 1,9 |
| Relleno hemisférico (cielo / suelo · int.) | #cfe6ff / #45602e · 0,66 | #9fcfff / #4f7f2a · 0,80 (sombras azules) | #bcd8ff / #4c6e2c · 0,72 | #a6d2ff / #548a2c · 0,90 (más plano) |
| Cielo (cenit / horizonte) | #2a7fd4 / #c3e2f0 | #1b74e6 / #a8e0ff | #2a86de / #bfe6fb | #1b74e6 / #a8e0ff |
| Niebla (color · inicio–fin) | #c3e2f0 · 40–1000 m | #b4e2ff · 70–1400 m | #c2e6fb · 60–1200 m | #b4e2ff · 70–1400 m |
| Suelo (saturación del splat) · hojas | 1 · — | ×1,25 · más verdes | ×1,10 · leve | ×1,30 · más verdes |
| Sombreado | Phong/Lambert | igual | igual | rampa suave en la luz directa (suelo, rocas, corteza, hojas); Vittata y personajes (Standard/Physical) intactos |
| Texturas del mundo | tope del preset (alto: sin tope) | igual | igual | 512 px como máximo |

La gradación va en el `ShaderChunk` `tonemapping_fragment` (constantes, raíz cuadrada → gradación → cuadrado: tres multiplicaciones
y una `sqrt` por fragmento; los sprites `toneMapped = false` quedan fuera). Cambiar de look recompila los programas (tirón de
0,5 a 2 s, solo al cambiar). Con lluvia o neblina el clima (`clima.js`) manda sobre luz, niebla y cielo; al volver el sol el look
se repone solo. El agua recibe los colores de cielo del look.

## Coste medido
(Chrome sin interfaz con GPU Metal, 1280×800, calidad «alto», con la Mac compartida con otros agentes: los ms por cuadro son
relativos entre looks de la misma tanda, no absolutos. Lienzo del mundo sin HUD.)

| Look | aldea | yunque | rio | ciudad | Texturas (estimadas) |
|---|---|---|---|---|---|
| fabrica | 49 ms · 105 calls · 566k tris | 45 ms · 109 calls · 693k tris | 55 ms · 124 calls · 250k tris | 31 ms · 108 calls · 666k tris | 227 MB, 15 de más de 512 px |
| vibrante | 29 ms · 105 calls · 566k tris | 21 ms · 109 calls · 693k tris | 25 ms · 124 calls · 250k tris | 42 ms · 108 calls · 666k tris | 227 MB, 15 de más de 512 px |
| soleado | 58 ms · 105 calls · 566k tris | 45 ms · 102 calls · 692k tris | 41 ms · 122 calls · 250k tris | 27 ms · 108 calls · 666k tris | 227 MB, 15 de más de 512 px |
| toon | 20 ms · 105 calls · 566k tris | 29 ms · 109 calls · 693k tris | 39 ms · 124 calls · 250k tris | 71 ms · 108 calls · 666k tris | 195 MB, 7 de más de 512 px |

- **Draw calls y triángulos: iguales** en los cuatro looks (la gradación no añade pasadas ni mallas). Los ms por cuadro varían
  por la carga de la Mac (de 20 a 70 ms en la misma vista), no por el look: el coste real de la gradación es una `sqrt`, tres
  `mix`/multiplicaciones y un cuadrado por fragmento, y la rampa toon un `smoothstep` en lugar de `saturate`.
- **Más liviano (toon):** las texturas del mundo a 512 px bajan la memoria estimada de texturas de 227 a 195 MB (−32 MB, −14 %):
  las 8 capas del splat del suelo (2048 px) y sus normales. Quedan 7 texturas de más de 512 px en los kits GLB (atlas HD de la
  ciudad y hojas); con `?tex=256` baja más. Ese ahorro vale igual para los otros looks (`&tex=512`), y en los presets «medio» y
  «bajo» el renderer ya lo hace (texMax 1024/512).
- Cambiar de look en la pausa recompila 45–50 programas: un tirón de 0,5 a 2 s, una vez.
- Sin borde (outline) en personajes: con three r128 obliga a una segunda pasada por malla (≈ +1 draw call por personaje y un
  10–20 % más de fragmentos) y tocaría los materiales de Vittata; descartado por coste y por la regla «Vittata no se cambia».

## Capturas
`docs/img/look_<look>_<vista>.png` (aldea, yunque, rio, ciudad) y la lámina A/B `docs/img/look_comparacion.png`. Se generan con
`tools/build/look_capturas.py` (una captura a la vez, reutiliza el Chrome y el servidor de `avtest.py`).

## Recomendación
**Vibrante** como nuevo look de fábrica, con toon como variante a probar en celulares. Razones: es el que más se acerca
al pedido (verdes y azules saturados, sol cálido, sombras azuladas, cielo intenso) sin cambiar el sombreado ni el peso; cuesta lo
mismo que el de fábrica; y se lee mejor en pantalla pequeña (más contraste entre suelo, agua y flora). **Soleado** es el paso
tímido (si Kelvin quiere conservar el aire realista). **Toon** da el aspecto más «estilizado» y es el único más liviano, pero
aplana las rocas y la ciudad antigua (pierde relieve) y conviene mirarlo en un celular real antes de elegirlo.
Pendiente de Kelvin: elegir look (una línea, `DEFECTO`); si elige vibrante o toon, conviene revisar los colores de las paradas
educativas y del cómic (las fotos del cómic van sin post, pero sí con la gradación).

## Vibrant Toon Refinado (26-oct, prototipo; decisión y regresiones en `DECISION_VISUAL_2026.md`)
Preset `vibrant_toon` (`?look=vibrant_toon`, chip «Vibrant Toon» en la sección oculta de la pausa; `DEFECTO` sigue en `null`).
Toon como base, refinado:
- Gradación con rodilla: sat 1,24 · con 1,07 · cálida, pero la saturación cae a 1 en las altas luces (l > 0,78) y un hombro
  suave recorta lo que pasa de 0,9: no quema cielo, agua ni plumas claras. Exposición 0,78.
- Rampa toon a medias: `mix(smoothstep(-0,08; 0,5), saturate, 0,4)` en Phong, Lambert y en la hoja: rocas y ruinas conservan relieve.
- Bosque con variación: tinte por especie (5 paletas por material de hoja, elegidas por el nombre de su textura, dentro de ±20 %
  por canal) y por altura (copas más cálidas y claras, bajos más fríos; `vAvAlt` = altura local × escala de la instancia).
- Paleta unificada: rocas frías (0,9 · 0,93 · 1,0), corteza cálida, ruinas (atlas HD) piedra cálida; cielo, niebla y agua con el
  mismo azul; relleno hemisférico azul (sombras azuladas); suelo ×1,10.
- Borde de luz en los personajes: `#define AV_RIM` en los materiales Standard de las mallas con esqueleto (Vittata, cotorras,
  bandada), inyectado en `tonemapping_fragment` bajo `#if defined(STANDARD) && defined(AV_RIM)`: un Fresnel azul claro (0,55),
  ponderado por la luminancia de la pluma. Ni geometría, ni rig, ni texturas: al quitar el look el define desaparece.
- Texturas del mundo a 512 px, como toon.
- Capturas: `docs/img/vtr_<look>_<vista>.png` (aldea, yunque, rio, ciudad, criadero) y `docs/img/vtr_comparacion.png`; medidas en
  `docs/img/vtr_medidas.json` (`look_capturas.py --prefijo vtr_ --repetir 2`; `--movil` emula un celular).

## Pruebas
`AV.lookTest()`: de fábrica los ShaderChunks, la exposición, las luces y la clave de programas son los de three y del pack; cada
look se aplica (chunk, exposición, sol, cielo, niebla, clave de programas, chip de la pausa) y sube el croma medio de la imagen;
toon pone la rampa solo en Phong/Lambert y baja las texturas grandes; al quitar el look todo vuelve byte a byte (firma JSON) y
la imagen vuelve a la de fábrica; 0 errores de consola.
