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

## T62 · la vegetación (Claude web B · 16-nov)

**Qué pasaba.** `vegetacion.js` llena cada malla de flora (una por modelo y primitiva) con las instancias de las celdas de 32 m que tocan el cuadro. Esas celdas son cajas de 160 m de alto con 8 m de margen, así que traen árboles, plantas y rocas que quedan detrás o a un lado de la cámara. La esfera de T46 cubre todas las instancias de la malla y casi siempre toca el cuadro, aunque no se vea ninguna. Con el recorte de T46 encendido se seguían dibujando enteras fuera de cámara de 3 a 13 mallas por vista, 8–11 de ellas de flora (medido en el mismo build, sonda dentro de rendimientoModulosTest).

**Qué se cambió** (`src/engine/renderer.js`, en el mismo `ocultarFuera` de T46, y una marca en `vegetacion.js`):
- Las mallas de flora llevan `userData.recorteInstancias`.
- Para ellas, el renderer guarda además una esfera por instancia, con el mismo margen de T46 (×1,25 + 2 m, por el viento del shader, que mueve hasta ~2,5 m). Se rehace solo cuando cambia `instanceMatrix.version`, en un arreglo que solo crece.
- Si la esfera de todas toca el cuadro, se prueban las instancias una a una. La malla se apaga solo si ninguna toca el campo de visión.
- Igual que en T46, no se recorta lo que da sombra con el sol encendido (la banda `:sombra` en `alto`).
- Se hace en el dibujo, con la cámara de ese dibujo. No se quitan instancias al llenar las mallas: las fotos del cómic, los momentos y el manga dibujan con la cámara movida sin pasar por `drawScene`, y perderían los árboles de detrás.
- **Interruptor:** el de T46 (`G.renderer.fueraCamara.activo`). `fueraCamara.porInstancia` da las mallas apagadas instancia a instancia en el cuadro.

**Antes y después** (rendimientoModulosTest, `medio` sin sombras, mismo cuadro con el recorte apagado y encendido, media de 4 cuadros ABBA BAAB; solo el dibujo real, sin el precalentado, con el filtro de T54):

| Vista | Draw calls (T46 + T62) | Fuera de cámara dibujadas | Apagadas |
|---|---|---|---|
| Aparición, de frente | 130 → **124** | 10 → 5 | 8 |
| Aparición, de espaldas | 89 → **74** (−17 %) | 19 → 4 | 15 |
| Vuelo (40, 110), de frente | 83 → **69** (−17 %) | 16 → 2 | 14 |
| Vuelo, de espaldas | 63 → **57** | 10 → 5 | 5 |

- **Solo flora,** suma de las 4 vistas: **127 → 101** draw calls (−20 %). Con T46 solo, las mismas vistas dejaban 3, 13, 12 y 9 mallas enteras fuera de cámara; ahora quedan 0 de flora fuera incluso con el margen.
- **Lo que queda** (5 o menos por vista): unas 7 mallas de flora por cuadro con alguna instancia dentro del margen del viento, y lo que no es flora (faroles, vecinos, maraña, partículas, rocío).
- **Se ve igual:** «nada visible desaparece» compara instancia por instancia en las 4 vistas: 0 a la vista sin dibujar.

**Pruebas:**
- **rendimientoModulosTest:** «T62 · la vegetación entera fuera de cámara no se dibuja (instancia a instancia, sin sombra del sol)»: 0 mallas de flora dibujadas con todas sus instancias fuera (con el margen) y nunca más draw calls de flora. Las comprobaciones de T46 suman las 2 vistas en vuelo.
- **floraTest:** 19/19, sin cambios.

## Para otra tanda (no hecho)

- **Restos fuera de cámara (tras T62):** quedan 2–5 draw calls por vista. Son mallas con `frustumCulled = false` que se mueven en el shader (nubes, partículas, rocío, impostores, decals del golf) y `InstancedMesh` repartidas que no son flora (faroles, vecinos, maraña). Se les podría poner `recorteInstancias` una a una, pero el margen de cada una depende de cuánto las mueve su shader (la bandada vuela en el shader).
- **Pasto y manchas:** el pasto rodea al jugador (siempre hay algo en el cuadro) y las manchas bajo los árboles son 7 330 instancias en 1 draw call. Recortarlas solo bajaría triángulos.
- **NPC V18 (Chispa: 29 mallas, 13 materiales):** sus piezas cuelgan de nodos que anima el `AnimationMixer` y que encienden las apariencias por nombre. Fundirlas rompería la animación sin un pase en Blender (decisión de arte).
- **Rival y Arausiaca:** se dibujan con 28 k triángulos hasta 60 m. Un LOD a distancia sería un cambio del modelo de la cotorra, y el modelo de Vittata no se toca.
