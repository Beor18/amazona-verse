# Modernización 2026: «traer el proyecto al 2026, el mapa, los colores, todo»

Pedido de Kelvin (26-oct-2026). Meta: que se vea y se sienta como un juego actual (estilizado, vibrante, con vida) sin tocar a
Vittata (modelo y rig), sin pasar del presupuesto del móvil (≥ 30 FPS en móvil medio, ≤ 150 draw calls, +0 MB de descarga
salvo lo anotado) y **sin cambiar de motor**: three r128 ya hace todo lo de abajo (shaders propios, instancias, EffectComposer,
WebGL2). Migrar a r16x o a otro motor costaría semanas, rompería el pipeline meshopt/WebP y los 13 tests, y no da nada que estas
técnicas no den. Solo es un plan: no se compiló ni se midió nada nuevo; los costes son estimaciones sobre las medidas de
`LOOK_VIBRANTE.md` (105–124 draw calls, 250–693k tris por vista) y hay que confirmarlos con `#fps` en cada carril.

## 1. Diagnóstico: qué se ve «viejo» hoy
| Área | Qué se nota | Archivo y causa |
|---|---|---|
| Luz y color | Imagen gris-realista, verdes apagados, sombras grises | `src/game/look.js` `DEFECTO = null`: el look vibrante existe pero no es el de fábrica; `renderer.js` hemi #fff4dc/#2f5a3a sin tinte de cielo |
| Posproceso | Bloom, gradación y viñeta solo en «alto» (`post: 2`); medio y bajo salen planos | `renderer.js` `PRESETS` (medio/bajo `post: 0`); un solo nivel de bloom a media resolución |
| Cielo | Degradado de dos colores + 16 tarjetas de nube pintadas en lienzo; sin disco solar con halo, sin rayos, sin volumen | `renderer.js` bloque `sky`/`nubes` (ShaderMaterial con `uCenit`/`uHorizonte`, nubes `InstancedBufferGeometry`) |
| Agua | Técnica correcta (profundidad, Fresnel, espuma de orilla) pero color desaturado y espuma «realista», sin destellos ni bandas estilizadas | `src/engine/agua.js` frag del mar (l. 159–178) y del río (l. 250) |
| Vegetación | Hojas opacas Phong sin translucidez; pasto solo a 19 m y 0 en bajo; tinte por instancia uniforme (sin degradado base→punta) | `vegetacion.js` `DIST.pasto: 19`, `hojaMaterial`, preset `pasto: 0` |
| Terreno | Splat de 4 capas bien hecho, pero la misma paleta en toda la isla: Villa Raíz, El Yunque y la bahía se ven iguales | `terreno.js` `splatMaterial` (sin tinte por zona); `calidadSplat` apaga normales en bajo |
| Materiales | Mundo en Phong/Lambert con especular genérico (brillo plástico en rocas y corteza) | `terreno.js`, `vegetacion.js`, kits GLB de `streaming.js` |
| Personajes | Vittata es Standard/Physical y está bien; los NPC y la fauna no reciben el mismo mimo de luz (sin luz de borde) | intocable (`src/personaje/*`); NPC en `actores.js`, `fauna.js` |
| UI y HUD | Paneles de vidrio oscuro correctos pero estáticos: sin tipografía propia fuera del logo (Fredoka solo en el SVG de `index.html`), sin micro-animaciones al sumar recursos, toasts planos | `src/ui/tokens.css`, `ui.css` (`--dur-*`, `--ease-pop` ya existen y se usan poco), `index.html` l. 111–126 |
| Cámara | Sigue bien y tiene sacudida y FOV +8 al volar, pero sin inclinación en giros, sin dolly al aterrizar ni «plano de descubrimiento» | `src/engine/camara.js` (`CAM`, `juice`, `fov`) |
| Efectos | Partículas `Points` cuadradas sin textura ni brillo; sin partículas ambientales (polen, hojas, luciérnagas); recoger un objeto es un `burst` de 16 puntos | `src/engine/fx.js` (`burst`, `PointsMaterial` sin `map`), `src/game/objetos.js` l. 50 |

## 2. El salto a 2026, por área (todo cabe en r128 y en el móvil)
Costes: ms estimados por cuadro en móvil medio a DPR 1,5; «calls» = draw calls añadidos. B/M/A = en qué calidad va.
| # | Técnica | Cómo, en este motor | Coste | B / M / A |
|---|---|---|---|---|
| 1 | **Look vibrante de fábrica** | `DEFECTO = 'vibrante'` en `look.js`; revisar paradas educativas y cómic (ya avisado en LOOK_VIBRANTE) | 0 ms, 0 MB (medido: mismas calls y tris) | B M A |
| 2 | **Post por niveles** | medio: bloom a 1/4 de resolución (umbral 0,9, fuerza 0,18) + viñeta; bajo: solo viñeta y gradación, que ya van gratis en el `tonemapping_fragment` del look (sin composer) | medio +1,5–2,5 ms (3 pases a 1/4), +4 MB GPU; bajo 0 | — M A |
| 3 | **Agua estilizada** | subir saturación (`uProf` turquesa más puro), espuma en 2 bandas con borde duro (`step` sobre el ruido que ya hay), destellos del sol con `pow(…, 60)` sobre la normal, orilla húmeda (oscurecer el splat de arena a < 0,4 m del nivel) | +0,2 ms (mismo shader, 6 instrucciones), 0 calls | B M A (bandas y destellos solo M A) |
| 4 | **Cielo vivo** | degradado de 3 paradas (cenit, medio, horizonte cálido) + disco solar con halo en el shader del cielo; nubes con `uTime` deformando la tarjeta (ya hay `uTime`) y 2 capas (altas lentas, bajas rápidas); **rayos de luz**: en A, pase radial de 8 muestras a 1/4 contra la máscara del sol (añadido al composer); en M, 6–10 tarjetas aditivas «haz de luz» bajo el dosel del bosque | cielo +0,1 ms; nubes 2.ª capa +1 call; rayos A +1,5 ms a 1/4; haces M +1 call | cielo B M A; rayos A; haces M A |
| 5 | **Viento** | ya existe en vértice (hojas, pasto). Falta: ráfagas visibles con el clima (`clima.js` ya tiene ráfaga lateral: conectar `fuerza` al viento de `vegetacion.js`) y hojas sueltas al pasar (ver 8) | 0 ms | B M A |
| 6 | **Hojas translúcidas** | en `hojaMaterial`, luz de envoltura (`wrap`: `dot(n,l)*0,5+0,5`) y un término de transmisión `pow(max(dot(v,-l),0),3)` × verde claro; degradado de tinte base→punta con la `y` local | +0,1 ms | B M A |
| 7 | **Hierba en instancias cerca** | ya es `InstancedMesh`; subir `DIST.pasto` a 26 (M) y 34 (A), `pasto: 0,3` en bajo con tarjetas de 2 triángulos, fundido por tramado al final del radio | M +0,8 ms, +1 call; A +1,5 ms | B(poca) M A |
| 8 | **Partículas ambientales** | módulo nuevo `src/engine/ambiente.js`: 1 `Points` con textura (polen de día, luciérnagas al atardecer o en neblina, hojas al viento cerca de árboles), 150/300/500 puntos movidos en el vertex shader con `uTime` (sin CPU) | +0,3 ms, +1 call, 64 KB de textura | B M A |
| 9 | **Terreno con identidad por zona** | textura de tinte 64×64 generada al cargar desde `MAPA.pois`/zonas (sin tocar `mapa_lib.py`): El Yunque verde azulado y húmedo, Villa Raíz verde cálido, bahía arena clara, mesa del este ocre; multiplica el albedo del splat; en A, segunda capa de musgo por pendiente < 15° y altura > 60 m | +0,1 ms, 16 KB | B M A |
| 10 | **Materiales sin plástico** | bajar `shininess` y `specular` de rocas y corteza (Phong → casi Lambert), luz de borde (`rim`) suave en NPC y fauna con `onBeforeCompile` | 0 ms | B M A |
| 11 | **Cámara con vida** | inclinación (`roll`) ±4° al girar en vuelo, FOV según velocidad (+8 → +4…+12), dolly y leve sacudida al aterrizar, balanceo de 1 cm al caminar, «plano de descubrimiento» de 1,2 s al entrar a un POI nuevo (órbita corta, `prefers-reduced-motion` lo apaga) | 0 ms | B M A |
| 12 | **UI moderna** | tipografía propia (Fredoka para títulos y números, OFL, alojada en `assets/fonts/`, ≈ 40 KB woff2) con `font-display: swap`; micro-animaciones: el contador salta (`--ease-pop`) y suelta +1 flotante, toasts que entran deslizando con icono, barras con brillo que recorre, botones con «labio» ya existente + sombra de color; esquinas 16–20 px, bordes de 2 px más luminosos | 0 ms de GPU, 40 KB | B M A |
| 13 | **Recoger y descubrir** | `fx.js`: `burst` con sprite de estrella/pluma con brillo y textura (una atlas 256 px), anillo de luz que sube, 0,06 s de hit-stop (ya hay `hitStop`) y la cifra del HUD que salta; «descubrimiento» de POI: destello suave + título grande 1,5 s + acorde corto (`audio.js`) | +0,1 ms por evento | B M A |

## 3. Mapa: terreno y distribución (sin romper el capítulo 1)
- **No se mueve nada** que use el capítulo 1: alturas, POIs, colisiones, sendas, misiones y la crecida quedan igual. Río Amazonas
  y sendas de Kelvin ya están en el carril R (hecho R1); los ríos vivos van en T. Este plan solo añade color, luz y señales.
- **Zonas con identidad de color** (técnica 9 + luz local): Villa Raíz cálida y acogedora; El Yunque frío, azulado y con neblina
  a ras de suelo (`nieblaAltura` ya existe, bajar `h0` allí); Bahía Bio turquesa y arena clara con palmas más amarillas; mesa del
  este ocre con la piedra crema de la ciudad; el río con agua verde parda y espuma blanca. Los límites se dibujan con un mapa de
  zonas de 64×64 que también lee `ambiente.js` (luciérnagas en el Yunque, polen en la villa, burbujas en la bahía).
- **Puntos de interés que se ven de lejos:** cada POI principal tiene una silueta alta y un color único visible a 300 m: la
  cascada con neblina permanente, la ceiba héroe con copa más clara, la torre vigía con bandera, el complejo de ruinas con haz de
  luz al atardecer. Se hace con los modelos que ya hay (tinte por instancia, escala) y con los haces de la técnica 4; sin
  geometría nueva.
- **Misiones legibles desde el aire:** el objetivo activo lleva una columna de luz suave (ya hay `guide` en `fx.js`: darle
  textura, altura y color del estado).
- Fase B del mapa (región Río Amazonas) no entra aquí: requiere la arquitectura de regiones y la decisión de Kelvin.

## 4. Plan en carriles (para agentes con créditos de la API)
Ordenados por impacto visual entre coste. Archivos sin cruces entre carriles, salvo `renderer.js`, que lo tocan 26-A y 26-B:
**esos dos van en orden (A antes que B), no en paralelo**. Todos: build en carpeta propia, 13 baterías en verde, 0 errores de
consola, FPS y calls medidos con `#fps` en las 4 vistas de `look_capturas.py` (aldea, yunque, rio, ciudad) y capturas de antes y
después en `docs/img/m26_<carril>_<vista>_{antes,despues}.jpg` (reutilizar `tools/build/look_capturas.py`).
| Carril | Qué (técnicas) | Archivos | Tamaño | Pruebas |
|---|---|---|---|---|
| 26-A | Look vibrante de fábrica + post por niveles (1, 2) | `src/game/look.js` (una línea), `src/engine/renderer.js` solo `PRESETS` y bloque post | S | `lookTest`, `calidadTest`, `contextTest`; medio ≥ 30 FPS en el perfil simulado |
| 26-B | Cielo vivo: degradado, sol, nubes en 2 capas, rayos (4) | `src/engine/renderer.js` bloque `sky`/`nubes`, pase nuevo en el composer | M | `contextTest` (el cielo vuelve tras perder contexto), `climaTest` (lluvia y neblina siguen mandando), +1,5 ms máx. en A |
| 26-C | Agua estilizada (3) | `src/engine/agua.js` | M | `selfTest`, `climaTest` (crecida intacta), captura del río y la bahía; alfa y profundidad iguales en los puentes |
| 26-D | Hojas translúcidas, pasto más lejos, ráfagas del clima (5, 6, 7) | `src/engine/vegetacion.js` | M | `streamingTest` (≤ 150 calls en la vista más cargada), `contextTest` (atlas), FPS en el yunque |
| 26-E | Partículas ambientales (8) + mapa de zonas compartido | `src/engine/ambiente.js` (nuevo), enganche de 1 línea en `index.html` | S | `ambienteTest` nuevo: 1 draw call, ≤ 500 puntos, se apaga en bajo si FPS < 30, 0 fugas tras 2 vueltas |
| 26-F | Terreno por zonas y materiales sin plástico (9, 10) | `src/engine/terreno.js`, `src/engine/actores.js` (rim) | M | `selfTest`, `calidadTest`; `splatAt` y `height` sin cambios (test de igualdad byte a byte de la rejilla) |
| 26-G | Cámara con vida (11) | `src/engine/camara.js` | S | `movementTest` (casos nuevos: roll vuelve a 0, reduced-motion apaga todo), nada atraviesa el terreno |
| 26-H | UI 2026 (12) | `src/ui/tokens.css`, `src/ui/ui.css`, `index.html` solo `<link>`/`<style>` | M | `uiTest`/accesibilidad (contraste AA se mantiene, `docs/UI_SYSTEM.md`), táctil a 360 px de ancho |
| 26-I | Recoger y descubrir (13) | `src/engine/fx.js`, `src/game/objetos.js` l. 50 y 71, `audio.js` (un acorde) | S | `missionTest`, `selfTest`; 200 partículas vivas máx. (ya es el tope de `fx.js`) |
Paralelo posible: A→B en una terminal; C, D, E, F, G, H, I cada uno en la suya. Estimación con sonnet: S ≈ 3–5 USD, M ≈ 6–10 USD;
26-B y 26-F conviene hacerlos con opus (shaders). Total orientativo: 55–75 USD. Nada se publica sin la aprobación de Kelvin.

## 5. Qué decide el fundador `[KELVIN]`
1. **Look de fábrica:** vibrante (recomendado) o toon para móvil. Es una línea y destraba todo el plan.
2. **Grado de estilización:** cielo y agua «de dibujo» (bandas, espuma dura, sol con halo grande) o solo más saturados.
3. **Paleta por zona** (sección 3): aprobar los cuatro colores de identidad o dar los suyos.
4. **Tipografía:** Fredoka alojada en el repo (descarga de ≈ 40 KB, licencia OFL; requiere su aprobación de descarga) o seguir sin
   fuente propia.
5. **Gasto de API:** el total orientativo (55–75 USD) y el orden; propuesta: A, I, G, E primero (lo más barato y visible).
6. **Pulso del juego:** cuánta «vida» de cámara (plano de descubrimiento sí/no) y cuánto brillo en recoger (sobrio o festivo).
