# Arquitectura · Amazona Verse Engine (AVE)

Base reutilizable para juegos educativos 3D: Three.js r128 UMD, scripts clásicos sin bundler, publicable como Claude artifact. Un fork cambia el contenido sin tocar el motor.

## Capas

```
index.html          markup y estilo (rol UI/UX); aquí solo cambian las <script>
      │
content/<pack>/     el juego: datos + scripts pequeños    AVE.registerPack({ id, ... })
      │  lo leen
src/game/           sistemas genéricos                    AVE.module('misiones', G => api)
      │
src/engine/         motor                                 AVE.module('renderer', G => api)
      │
src/personaje/      Vittata 3D y ropero (rol TA)          window.AVCharacter, AVWardrobe, AVShowcase
      │
Three.js r128 (CDN) · assets/ (modelos .glb y su _glb.js base64, texturas, sprites)
```

Una capa solo usa las de abajo. El motor no sabe nada de Villa Raíz y `content/cap1` no edita `src/`.

- **src/engine:** `core` (namespace, módulos, packs, ganchos, arranque), `assets` (cargador único GLB/base64), `renderer` (WebGL y bucle), `camara`, `input`, `fisica` (colisiones y movimiento), `terreno`, `agua`, `audio`, `fx`, `ui`, `pausa` (congela el mundo: menú, portada o `G.pausa.set`), `actores` y `guardado`.
- **src/game:** `eventos`, `dialogo`, `interaccion`, `objetos`, `misiones`, `diario`, `aula` (idioma, voz, texto corto, fichas verificadas, preguntas y Modo Maestro; lo activa `pack.aula`), `creador` y `comic`.
- **src/pruebas/motor.js:** ayudas de prueba, `accessoryTest` y `templateTest`.
- **src/boot.js:** elige el pack y expone `window.AV`.

## Arranque

1. Cada archivo de `src/` registra una fábrica; cada archivo de `content/` aporta su parte del pack (las claves se fusionan).
2. `boot.js` elige el pack: `?pack=<id>`, luego `AVE.config.pack` y si no, el primero registrado. Si falta, carga `content/<id>/pack.js` y los `archivos` que liste.
3. `AVE.boot(id)` instancia los módulos en orden de carga, corre los `preparar(G)` del pack, carga la partida (o abre el creador) y arranca el bucle.

## Contratos

- **G es el único canal.** `G.S` es el estado (identidad fija: `guardado.replace` lo rellena), `G.pack` el pack, `G.c` el espacio privado del pack y `G.<módulo>` cada API. Sin más globales que `AVE` y `AV`.
- **Ganchos** `G.on(nombre, fn, prioridad)`; el número menor va antes:
  - `update(dt, busy, moving)` y `render(dt, t, moving)`, en cada cuadro.
  - `moved(busy)`: tras mover al jugador.
  - `apply`: tras cargar o reiniciar, cada módulo deja el mundo como dice `G.S`.
  - `escape`, `cardHidden`, `listo`, `pausa(activa)`, `aula(clave, valor)` y `aprendizaje({ tipo, id, intento })`.
- **Misión** = `{ id, titulo, hud, pasos: [{ texto, hasta, guia }], recompensa: { hito }, alCompletar }`.
  - Se completa cuando todos sus pasos se cumplen en orden. Sin pasos es un hueco y se ignora. La `educativa` de cap1 ("La ruta de la gota", `content/cap1/educativa.js`) marca sus pasos en `S.edu.hecho` y referencia los lugares por id de POI.
  - Disparadores `hasta`: `tiene`, `recogido`, `evento`, `marca`, `cuenta`, `paso`, `mision`, `cerca`, `todos`, `alguno` o una función `(S, G)`.
- **Historia:** `historia.pasos` (índice en `S.step`). Un paso avanza solo con `hasta`; si no, lo avanza un script con `G.misiones.advanceTo(n)`.
- **Recompensas:** `ropa: [{ clave, hito, nombre, pista, viste }]`. El hito es el id de una misión o de un hito del Diario.
- **Pack (claves):** `meta`, `jugador`, `mundo`, `npcs`, `objetos`, `recursos`, `historia`, `misiones`, `diario`, `ropa`, `eventos`, `dialogos`, `comic`, `guardado`, `gestos`, `aula`, `inicio(G)`, `preparar(G)`, `pruebas` y `depuracion`. Cada esquema está documentado al inicio del módulo que lo lee.
- **Personaje** (`src/personaje`, del TA):
  - El motor usa de `AVCharacter`: `create()` (`root`, `height`, `applyLook`, `play`, `update` y las banderas de animación), `normalizeLook`, `buildAccessory`, `disposeObject`, `renderPortrait`, `SLOTS`, `ACCESSORIES` y `SPECIES`. De `AVShowcase`: `mount`, `unmount`, `setLook` y `status`.
  - `character.js` depende de `AVE.assets.loadGLB`.

## Forkear y crear un juego nuevo en 30 minutos

1. **2 min.** Copia `content/plantilla/` a `content/mijuego/` y cambia `id: 'mijuego'` y `meta.almacen` (prefijo propio en localStorage).
2. **3 min.** Ábrelo con `index.html?pack=mijuego`. Corre `AV.selfTest()` dentro.
3. **10 min, el mundo.** En `mundo` defines relieve (`ondas`, `relieves`), `lugares`, `agua`, `arboles`, `cielo` e `islas`. Después vienen `npcs`, `objetos` y `recursos`. Sin `modelo`, el motor usa uno genérico.
4. **10 min, el juego.** Define `historia.pasos`, `misiones`, `diario`, `ropa`, `dialogos` (escenas con disparadores) e `inicio(G)`. Si hace falta, añade `meta.hud` para retitular el HUD.
5. **5 min, lo que no es dato.** Va en `preparar(G)`: piezas 3D, interactuables con `G.interaccion.add`, minijuegos y ganchos. Ejemplo: el Simon del coquí en `content/cap1/misiones.js`.
6. **Para publicarlo como juego propio,** en `index.html` cambia las `<script>` de `content/cap1/` por las de tu pack. Pasa `AV.selfTest`, `AV.accessoryTest` y `AV.templateTest`.

## Convenciones

- Una fábrica o IIFE por archivo, `'use strict'`, sin `import` y sin `fetch` a otros dominios. Las CDN solo pueden ser cdnjs, jsdelivr/npm o unpkg, con versión exacta.
- Los datos grandes (diálogos, lecciones, modelos) van en `.js` que asignan un global (`window.AV_*`); el `.json` queda como fuente. El artifact no siempre permite `fetch`.
- Las rutas son relativas al documento, no al script.
- Las claves de los datos del pack van en español. Las claves de `G.S` son estables: renombrarlas exige una migración en `guardado.migrar` y subir `guardado.version`.
- Los colores se escriben en sRGB y `renderer.linearize` los pasa a lineal. El color de salida y el tone mapping son del TA.
- Cada pack trae sus pruebas en `pruebas`. Antes de cada commit deben pasar `AV.selfTest`, `AV.missionTest`, `AV.accessoryTest` y `AV.templateTest` (en cap1, también `AV.eduTest` y `AV.maestroTest`).
- Perchas de una vía (ramas donde posarse): `G.fisica.addPercha({ x, z, r, y })`; el suelo bajo el jugador es `G.fisica.suelo(x, z, y)`.
- Eventos y guardado sin datos personales.

## Datos compartidos entre packs (`content/comun/`)
Datos que varios content packs pueden reutilizar sin copiarlos (hoy: `huevos.js`, los huevos, etapas y XP del criadero). Un fork los conserva o los reemplaza; ningún motor depende de ellos.

## Streaming de edificios (`src/engine/streaming.js`)
Los edificios de Kelvin se cargan por zonas y se dibujan instanciados. `mundo.js` lo arranca y pone las colisiones de cada instancia.
- **Zonas:** una zona es el `grupo` de sus entradas. Según la distancia del jugador al borde de la zona, y por preset, tiene tres niveles:
  - *cerca* (≤ 50/60/75 m): el modelo completo, más las colisiones de cada instancia la primera vez que llega a este nivel. Las colisiones ya no se quitan.
  - *lejos* (hasta la distancia de dibujo de 150/190/320 m, recortada por la niebla): solo el LOD lejano.
  - *fuera*: nada en memoria.
  - Histéresis de 30 m, y 3 s de gracia antes de soltar un modelo.
- **Arranque:** antes de `mundoListo` entra el modelo completo de las zonas a menos de 20/25/30 m del inicio y el LOD lejano de las visibles a menos de 120/150/150 m. El resto espera a que el jugador ande 2 m y llegan en segundo plano: lo más cercano primero, una descarga a la vez y la CPU troceada con `requestIdleCallback`.
- **Dibujo:**
  - Una `InstancedMesh` por modelo × LOD × material, con el nombre `edificiosInst:*` y `sinSolido`.
  - Cada cuadro se eligen las instancias visibles. Pasan las que están dentro del frustum y de la distancia de dibujo, y también las de cerca que caen en el radio de sombra.
  - El LOD de cada instancia lo decide su distancia a la cámara, con 35/50/60 m ± 8. Una zona que queda entera más allá de esa distancia se dibuja con sus lejanos fundidos en una sola malla (`edificiosZona:*`): un draw call por zona.
  - Los sólidos de Movimiento llegan por `G.solidos.agregar` en cada instancia.
- **Liberar:** quita las mallas, llama a `geometry.dispose()` y suelta materiales y texturas. Los materiales se comparten por nombre y llevan conteo de referencias. La cadena base64 la suelta `AVE.assets.loadGLB`.
- **Kit:**
  - `<modelo>.glb | _glb.js` es el modelo de cerca.
  - `<modelo>_lejos.glb | _glb.js` es el lejano, con el material `AV_Lejos` y color de vértice. Solo se usa si el manifiesto opcional `AV_EDIFICIOS_KIT` (`mundo.edificios.kit`) lo declara. Si no, el lejano se genera simplificando el de cerca.
- **Datos del mapa:** `edificiosKelvin` y `escenaKelvin.compacto`.
  - Forma plana: `{ id, glb|modelo, pos, rotY, grupo, rol?, escala?, orientar?, yExacta?, escalaPack? }`.
  - Forma compacta: `{ grupo, modelo, inst: [[x, y, z, rotY, escala?] | matriz de 16], … }`.
  - `zonasEdificios.<grupo>` lleva `{ centro, radio, orientar?, yExacta?, escalaPack? }`.
  - El detalle está en el encabezado de `streaming.js`.
- **Prueba:** `AV.streamingTest`. Comprueba que:
  - lo de cerca del inicio está cargado;
  - la vista más cargada no pasa de 150 draw calls;
  - al entrar en una zona, esta carga y coloca sus instancias, y sus colisiones quedan activas;
  - al salir, se sueltan el modelo completo y luego el lejano;
  - no queda base64 en memoria;
  - tras dos vueltas, la memoria de los edificios y el heap siguen estables.
