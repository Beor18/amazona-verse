# T46 · Rendimiento en el teléfono

Claude web B · 15-nov.

## Cómo se midió

- **Equipo emulado:** Chrome sin pantalla con Playwright `devices['iPhone 13']` (390×664 CSS, táctil, user agent de iPhone).
- **Calidad:** la que elige el juego, `bajo` (perfil `iphone`), con el DPR dinámico del juego (1,25–1,75).
- **GPU:** SwiftShader, por software. Los **ms por cuadro solo orientan**: varían de 270 a 1400 ms entre tomas por el DPR dinámico y la carga de la máquina. Los **draw calls, los triángulos y las texturas son fiables**.
- **Antes/después en el mismo cuadro y con la misma cámara:** el recorte nuevo tiene un interruptor de medida (`G.renderer.fueraCamara.activo`). Cada vista se dibuja dos veces seguidas, con el recorte apagado y encendido, contando los draw calls del cuadro entero.
- **Columna «build anterior»:** el mismo recorrido en el build de `6c5e904c`, para texturas, geometrías y programas. La cámara de ese build no cae exactamente igual, así que sus draw calls no se comparan con los demás.
- **Scripts de medida:** fuera del repo, en `/home/user/.avt/capturas_t46/scripts/` (`medir.js`, `capturas.js`, sondas `p1`–`p5`).

**Vistas medidas:**
- **Arranque:** aparición en Villa Raíz.
- **Vuelo:** a 28 m sobre el bosque (40, 110).
- **Plaza:** el centro de Villa Raíz, con Arausiaca y la gente.
- **Ruinas:** el tepuy, a 40 m de la ciudad (-4, -91).
- **Duelo:** `v18combate.iniciar`.
- **Minigolf:** `v18minigolf.irYJugar`.
- **Construir:** `construir.empezar` en la aparición.

## Antes y después por vista

En las columnas de draw calls y triángulos, «antes → después» es el mismo cuadro con el recorte apagado y encendido.

| Vista | Draw calls | Triángulos | Mallas apagadas | Texturas | Geometrías | Programas | ms/cuadro (orienta) |
|---|---|---|---|---|---|---|---|
| Arranque | 105 → **93** (−11 %) | 323 k → **259 k** (−20 %) | 12 | 133 | 249 | 89 | 585 |
| Vuelo | 58 → **45** (−22 %) | 330 k → **316 k** (−4 %) | 17 | 134 | 274 | 93 | 920 |
| Plaza | 72 → **63** (−13 %) | 237 k → **195 k** (−18 %) | 9 | 133 | 310 | 95 | 269 |
| Ruinas | 56 → **49** (−13 %) | 214 k → **212 k** | 12 | 136 | 317 | 98 | 439 |
| Duelo | 76 → **65** (−14 %) | 212 k → **205 k** (−3 %) | 14 | 135 | 316 | 98 | 1422 |
| Minigolf | 74 → **62** (−16 %) | 238 k → **174 k** (−27 %) | 12 | 135 | 318 | 98 | 933 |
| Construir | 101 → **91** (−10 %) | 254 k → **218 k** (−14 %) | 10 | 136 | 324 | 99 | 508 |

**Build anterior (`6c5e904c`), mismo recorrido:**

| Vista | Texturas | Geometrías | Programas |
|---|---|---|---|
| Arranque | 126 | 225 | 86 |
| Vuelo | 132 | 281 | 91 |
| Plaza | 134 | 309 | 95 |
| Ruinas | 135 | 313 | 95 |
| Duelo | 134 | 313 | 95 |
| Minigolf | 135 | 316 | 96 |
| Construir | 135 | 326 | 96 |

Las texturas, las geometrías y los programas no cambian con el recorte: varían ±7 según lo que el streaming haya cargado en cada toma. Los muebles del bohío pasan de 7 materiales por casa a 4 compartidos por todas las casas (ver «Qué se quitó»).

## Qué se encontró

Se dibujaban **28–43 draw calls por cuadro fuera de cámara** (sonda `p5`):
- **Instancias:** three recorta un `InstancedMesh` con la esfera de su geometría, que es una sola instancia en el origen del objeto. Por eso el juego les pone `frustumCulled = false` o los deja con una esfera falsa, y se dibujan aunque todas sus instancias queden detrás de la cámara. Pasaba con la flora por región y tipo, los frutos, los faroles, la bandada, la fauna, las especies invasoras, los troncos del golf y los peces.
- **Personajes:** las cotorras con esqueleto (Arausiaca, la rival del duelo, los NPC V18) llevan `frustumCulled = false`. Eran unos 28 k triángulos cada una, también de espaldas.

**Revisado y ya estaba bien** (no se toca):
- **Edificios:** las fusiones de streaming.js por material ya agrupan en tramos (KIMI-192/225).
- **Máquina y transmisor del taller** (`content/cap1/mundo.js`): ya van fundidos por material, con materiales en caché.
- **Objetos pequeños lejanos:** ya los quita `cullPequenos` (55 m en `bajo`).
- **Sombras:** en `bajo` (el teléfono) no hay.
- **Modos al salir:** tras salir del duelo, el minigolf y Construir no queda nada visible. Lo que queda son mallas ocultas (flecha y mira del golf), que no dibujan.
- **Texturas ocultas:** las de la flora de otras regiones, los marcadores del Diario y la precarga de la Ráfaga son a propósito: precarga y streaming.

## Qué se quitó, sin cambiar la imagen

**1. Recorte fuera de cámara** (`src/engine/renderer.js`, `ocultarFuera`, dentro de `drawScene`). Sigue el patrón de `ocultarPendientes`: las mallas se apagan solo durante ese dibujo y no se toca la lógica del juego.
- **InstancedMesh:** se calcula una esfera que cubre todas sus instancias. Se rehace solo cuando cambia `instanceMatrix.version`, y lleva un margen de ×1,25 + 2 m por el viento, las alas y el bote, que van en el shader. Los de más de 4000 instancias no se tocan.
- **Mallas con esqueleto y `frustumCulled = false`:** se usa la esfera de su geometría con margen ×1,5 + 1,5 m. Vittata (`personaje`) no se toca.
- **No se recorta:** lo que proyecta sombra con el sol encendido (en `medio` y `alto` su sombra puede entrar en el cuadro) ni lo que lleva `userData.sinCulling` (el dosel se recorta solo).
- **Con el post encendido:** se usa la cámara principal, que es la del composer.
- **Se expone** `G.renderer.fueraCamara` (`{ ultimo, activo }`), y `stats().fueraCamara` da las mallas apagadas en el cuadro.

**2. Materiales compartidos en los muebles del bohío** (`src/game/bohios.js`): antes se creaba un `MeshStandardMaterial` nuevo por pieza (7 por casa); ahora hay uno por color (4) para todas las casas.

## Se ve igual

Hay capturas 1x de 3 vistas con el recorte apagado y encendido en el mismo cuadro congelado, en `/home/user/.avt/capturas_t46/` (`t46_<vista>_antes.png` y `t46_<vista>_despues.png`).

| Vista | Draw calls | Píxeles distintos (de 258 960) |
|---|---|---|
| Arranque | 107 → 94 | **0** |
| Plaza | 85 → 74 | **0** |
| Vuelo | 60 → 47 | **0** |

## Pruebas que lo fijan

- **rendimientoModulosTest:**
  - «T46 · el renderer expone el recorte fuera de cámara».
  - «T46 · lo que deja de dibujarse estaba de verdad fuera de cámara (nada visible desaparece)»: compara instancia por instancia.
  - «T46 · fuera de cámara se dibuja menos que sin el recorte (y nunca más draw calls)»: en la aparición, mirando hacia delante y de espaldas. Se miden 8 cuadros en orden ABBA BAAB y se compara la media de cada lado: así una carga de streaming o un precalentado en curso cae igual en los dos lados.
- **streamingTest:** «T46 · En la vista más cargada, lo que queda fuera de cámara no se dibuja (nunca suma draw calls)». Cuenta solo los draw calls de la cámara principal, en 8 cuadros ABBA BAAB. El tope de 150 draw calls no cambia.

## Para otra tanda (no hecho)

- **Restos fuera de cámara:** quedan de 15 a 25 draw calls por cuadro. Son `InstancedMesh` con instancias a los dos lados de la cámara (la flora por región) y mallas con `frustumCulled = false` que se mueven en el shader (nubes, partículas, rocío, impostores, decals del golf). Recortarlas pide partir las regiones de flora en celdas más pequeñas, que es un cambio de vegetacion.js.
- **NPC V18 (Chispa: 29 mallas, 13 materiales):** sus piezas cuelgan de nodos que anima el `AnimationMixer` y que encienden las apariencias por nombre. Fundirlas rompería la animación sin un pase en Blender (decisión de arte).
- **Rival y Arausiaca:** se dibujan con 28 k triángulos hasta 60 m. Un LOD a distancia sería un cambio del modelo de la cotorra, y el modelo de Vittata no se toca.
