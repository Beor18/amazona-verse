# V18.4 · Inventario de edificios, piezas y sistemas (etapa 1, solo lectura)

Etapa 1 de la directiva `docs/equipo/V18_4_EDIFICIOS_VIVOS.md`. Repo en `055cf19`. No se tocó código del juego. Este inventario decide el trabajo de las etapas 2–4.

**Reutiliza y no repite:** `docs/equipo/AUDITORIA_EDIFICIOS.md` (1-nov, defectos de los 64 modelos: Kimi, HD boca abajo, ligeros incompletos), `docs/equipo/EDIFICIOS_INVENTARIO.md` (376 instancias contra el `.max`) y `docs/EDIFICIOS.md` (origen y licencias). Aquí se añade lo que la V18.4 pide y no estaba: **¿hay interior?, ¿hay puerta?, clase A/B/C, piezas, sistemas y pilotos.**

## Cómo se midió (reproducible)

1. **Recuento:** `assets/data/escena_kelvin_cap1.json` (375 instancias visibles, 1 oculta: `k187`), `assets/models/edificios/kit.js` (64 modelos), `assets/data/mapa_cap1.js` (`estructuras`, 6, y `edificiosKelvin`, 3 con rol: `refugio`, `casita` y `mirador`), las 42 piezas de plaza de `content/cap1/mundo.js` (`PLAZAS`: toldos, canoas y losas) y las piezas procedurales de `src/game/*`.
2. **Tris, materiales y draw calls:** se leyó cada `.glb` (ligero, `_hd` y estructuras del mapa) con un lector GLB en node (three r128 y `assets/vendor/meshopt`, los del repo). En el juego, cada par modelo × material con instancias visibles es 1 draw call por zona (`streaming.js`, InstancedMesh): el ligero cuesta 2–3 (materiales KB3D) y el `_hd` Savage 1 (atlas). Los `_hd` Ancient cuestan de 3 a 13 primitivas.
3. **¿Interior?** Sonda en planta con el mismo criterio que la búsqueda de vanos del juego (`src/engine/solidos.js`, `VA`): celdas de 0,15 m; pared = geometría en la franja de paso [piso+0,3, piso+1,1]; techo = geometría por encima de piso+1,8; se prueba en los 4 pisos horizontales más grandes. Exterior = relleno desde el borde. Con cierre morfológico de 0,45 a 1,3 m sale el espacio encerrado (m²) y si conecta con fuera (vano). La sonda **no distingue hueco de macizo**, así que se añadió una segunda prueba: 8 puntos × 16 rayos horizontales a 1 m del piso. Si la primera cara que tocan **mira hacia el punto**, es una habitación con caras interiores. Si **mira hacia fuera**, es el interior de una caja maciza.
4. **Prueba visual:** visor three r128 con caras delanteras en color plano y **caras traseras en rojo**. Si desde dentro se ve rojo, es la cáscara de un macizo. Se renderizó el exterior en 3/4 y el interior a 1 m del piso con FOV 95°, con un cilindro verde de 1,75 m (la altura de Vittata) como referencia. SwiftShader.
5. **Contraste con el juego:** la lista `MACIZOS` de `solidos.js` (KIMI-139) recoge los modelos en los que la búsqueda de vanos del juego dio 0 vanos en los 6 packs. Los que no están en esa lista sí tienen vanos, y el juego **los tapa con un panel** (BM6), salvo los bohíos marcados como abiertos (`G.esBohioAbierto`).

**Escala:** la del juego es la escala de la matriz de la escena × 0,95 (la escala del pack, `mundo.js`; algunos modelos usan 1). Los `bohio_redondo` de Villa Raíz van además ×1,75 (`escalaVilla`). Una puerta solo sirve si deja pasar el cuerpo de Vittata: 0,64 m de ancho (QA-201) y 1,75 m de alto.

Capturas (fuera del repo, en la carpeta de trabajo de la sesión, `scratchpad/v184/`; izquierda exterior, derecha interior):

| archivo | qué prueba |
|---|---|
| `inv_bohio_redondo_hd.png` | pared de tablas con caras hacia dentro, espacio para Vittata: **A** |
| `inv_casa_paja_a_hd.png` | habitación de tablas cerrada con caras interiores: **B** |
| `inv_torre_vigia_hd.png` | base de la torre: cuarto de tablas sellado (sin puerta): **B** |
| `inv_templo_mediano_hd.png` / `_ligero.png` | HD: dentro todo rojo, es un macizo. Ligero (Kimi): caja con la puerta pintada y el techo al revés: **C** |
| `inv_mirador_escalonado_hd.png` | cono macizo (rojo por dentro): **C** |
| `inv_casa_plataforma_hd.png` | la «Estación de Conservación» es una plataforma abierta con lona, sin cuarto: **C** |
| `inv_refugio_mapa.png`, `inv_casita_mapa.png` | estructuras propias del mapa (respaldo): cáscara cerrada, ventanas y puertas pintadas, sin caras interiores: **C** |
| `inv_caney_largo_hd.png`, `inv_casa_paja_b_hd.png`, `inv_muralla_atalaya_a_hd.png`, `inv_bohio_puntiagudo_hd.png`, `inv_carpa_f_hd.png` | casos dudosos, revisados |

## 1. Edificios del mundo

**Clases.**
- **A:** interior hueco y acceso transitable hoy.
- **B:** interior hueco (caras interiores verificadas), pero el acceso no sirve (vano tapado, puerta estrecha o cuarto sellado): hay que abrir y adaptar.
- **C:** macizo o cáscara sin caras interiores, o demasiado pequeño a su escala: se conserva la fachada y el interior va en un espacio modular con transición.
- **—:** estructura sin cuarto (portal, empalizada, puente, canoa, losa, muro, toldo o carpa abierta, monumento, plataforma).

**Recuento (64 modelos del kit; 378 instancias = 375 de la escena + 3 con rol):**

| clase | modelos | instancias |
|---|---:|---:|
| A | 1 | 4 |
| B | 2 | 8 |
| C | 20 | 118 |
| — | 41 | 248 |

Las 42 piezas de plaza (toldos, canoas y losas) son todas «—». Los «bohio_redondo» cuentan 4 en A y 41 en C; las torres vigía, 3 en B y 11 en C. A + B + C + — = 378.

Columnas: L = ligero (dibujo de cerca hasta el HD y **todas las colisiones**). HD = `_hd`. dc = draw calls por zona (L/HD). «m² sonda» = espacio encerrado a escala 0,95/1. «caras dentro» = fracción de rayos cuya primera cara mira al punto (L/HD).

| modelo (inst.) | zona (ejemplo) | tris L / HD | dc L/HD | m² sonda · techo | caras dentro L/HD | vano según el juego | clase |
|---|---|---|---|---|---|---|---|
| **bohio_redondo** (45) | Villa Raíz (k212 91,124) y 4 aldeas | 3282 / 6388 | 3/1 | 14,5 · 0,79 | 0,83 / 0,92 | sí; abierto en 4 casas | **A** en las 4 a ×1,75 (Villa Raíz y BM13); el resto, C por escala (0,37–0,41) |
| **casa_paja_a** (4 + rol `casita`) | Villa Raíz k194 (98,132; ×1,08), k195, k196; Meandro k193; Casita del Guardián (−104,138) | 3480 / 7868 | 3/1 | 30,6 · 0,57 | 0,80 / 0,75 | sí, tapado con panel; ≤ 0,9 m | **B** |
| **torre_vigia** (14) | Atalayas k300 (−61,84; ×1,10), k297 y k299 (×1,11); las otras 11, ×0,48–0,79 | 4452 / 11788 | 3/1 | sellado 7,9 · 1,0 | 1,00 / 1,00 | no (MACIZOS) | **B** en las 3 de escala ≥ 1; las 11 pequeñas, C |
| caney_largo (2) | Mangle k253 (109,23) | 1936 / 17060 | 3/1 | 121,7 · 0,89 | 0,59 / 0,56 | sí, tapado | C por escala (0,37: ~2,5 m de alto) |
| casa_paja_b (3) | Mangle, La Mina | 3503 / 8226 | 3/1 | 31,5 · 0,55 | 0,49 / 0,98 | sí, tapado | C por escala (0,37) |
| bohio_puntiagudo (4) | Mangle, La Mina, Meandro | 3269 / 7384 | 3/1 | 48,8 · 0,30 | 0,23 / 0,31 | no | C (sin vano; interior abierto o dudoso) |
| casa_plataforma (3 + rol `refugio`) | Estación de Conservación (167,183) | 3568 / 15694 | 3/1 | sobre la cubierta, abierto | 0,07 / 0,06 | no | C (plataforma sin cuarto) |
| mirador_escalonado (3 + rol `mirador`) | Mirador Yokahú (14,172) | 3685 / 12143 | 3/1 | macizo | 0,01 / 0,00 | no | C |
| complejo_ruinas (1) | Ciudad de los 36 (−14,177) | 15190 / 41179 | 6/1 | macizo | 0,32 / 0,79 | no | C |
| templo_grande, _a, _d, _e, _f (10) | Ruinas del Yunque | 884–2340 / 89k–213k | 5/10–12 | macizo | 1,0 (normales al revés, Kimi) / — | no | C |
| templo_mediano, _f, _g, _h (9) | Yunque, Mangle | 432 / 58k–462k | 5/11–13 | macizo | 1,0 / 0–0,56 | no | C |
| ruina_torre, _b, _c, _e, _f (29) | Yunque, Mangle | 316 / 1k–10k | 5/4–7 | macizo | — / 0–0,29 | no | C |
| muralla_atalaya_a / _b (22) | Villa Raíz, Yunque… | 4171 / 10012 · 3165 / 7883 | 3/1 | plataforma alta abierta | — | no | — |
| carpa_a…g, campamento_a/c/f, tienda_pequena, toldo_pequeno (59) | Toldos, Atalayas… | 702–1411 / 2k–189k | 2/1–3 | lona abierta | — | algunas sí | — |
| monumento_a…g (16) | Monumentos, Meandro… | 1588–4397 / 24k–322k | 2–3/1 | huecos sin cuarto | — | algunos sí | — |
| portal_*, empalizada, puente_madera, muro_roca, muro_templo, cercado_redondo, corral, torre_vigia_b, ruina_altar/pilar/portal/mirador, losa/bloque/plataforma_piedra, canoa (151) | todas las aldeas | 12–4607 | 1–4 | — | — | — | — |

**Estructuras propias del mapa** (`assets/models/mapa/*`; solo se dibujan si no carga el edificio de Kelvin que tiene su rol):

| estructura | tris | mats | lo que se ve | clase |
|---|---|---|---|---|
| `refugio` (Estación) | 3412 | 13 | cáscara cerrada, vidrio pintado | C |
| `casita` jíbara | 1336 | 11 | cáscara con piso; trae los materiales `AV_Piedra_Fogon`, `AV_Barro_Olla` y `AV_Tela_Hamaca` | C |
| `mirador` | 2024 | 6 | torre de piedra maciza, puerta pintada | C |
| `puente`, `muelle` | 2604, 2564 | 5, 6 | estructuras | — |
| `ruinas.glb` | — | — | sin colocar | huérfano |

**Piezas procedurales** (`src/game`):
- Taller de Vittata: `bohio_redondo` ×0,95 + `toldo_pequeno`, con collider de r 2,9 (`mundo.js:625`). Clase C.
- Refugio del jugador: `bohio_redondo` ×0,7.
- Puerto (`v18/puerto.js`): perforadora de primitivas, andamio, escombros y escalera.
- Muelle V18 (`v18/muelle.js`).
- Faroles y banderines (`arco.js`, `fiesta.js`).
- Todas son clase «—», o C sin interior.

**Colisión:** casi todo pasa por `solidos.js`, que rasteriza el **ligero**. Por eso, en los 18 restaurados por Kimi, la colisión no es la forma del HD (AUDITORIA_EDIFICIOS §1). Además hay colliders a mano: círculo o caja en `fisica.js` (`taller`, `refuge`, `bench`, `obj`…).

**Coste de render:** el streamingTest pone un tope de 150 draw calls en la vista más cargada, y en el Yunque se miden 129–182 (QA-nuevo-br1-3). Cada modelo nuevo visible añade 1 (HD Savage) o 2–3 (ligero) draw calls por zona.

## 2. Piezas y materiales reutilizables

| tipo | qué existe | dónde | uso en V18.4 |
|---|---|---|---|
| Atlas Savage y Ancient (UV propias, celdas de 1024) | `hd_savage` y `hd_ancient` en `.jpg` 4096, `_lq.jpg`/`.ktx2` 2048 y `_lq1024.jpg`/`.ktx2` (262/248 KB) | `assets/models/edificios/tex_hd/` | material compartido de paredes y suelos de madera, paja y piedra (1 draw call) |
| Atlas propio de interior | 1024, 4 baldosas Savage (tablas, madera labrada, tela, barro) dentro de `bohio_interior.glb` | `assets/models/entorno/` | material base del kit modular |
| Texturas sueltas del kit | 22 JPG de 2 MB (`tex/`), 62 `tex_original/` de 1024 (27 MB) | `assets/models/edificios/` | — |
| **Interior de bohío completo, sin usar** | `bohio_interior.glb`: 1172 tris, 451 KB. Hamaca, fogón de 9 piedras, 3 vasijas, cesto, banco y 8 vigas. Zonas de interacción en `bohio_interior_zonas.json` (descansar, calentar, mirar, sentarse). Puerta de 1,2 × 2,0 a ×1,75 | `assets/models/entorno/`, `tools/blender/interior_bohio.py` (BM4) | **0 referencias en `src/`**. Se puede usar ya para la Casa |
| Muebles procedurales del bohío | hamaca, tinaja y fogón con `G.interaccion` | `src/game/bohios.js` (Villa Raíz + 3 casas, BM13) | — |
| Piezas de Construir (13 tipos) | nido, techo de hojas, bromelia, flores, piedra, tronco, banderines; Mercadito: helecho, cerca, farol, comedero, mesa de dominó, hamaca | `src/game/construir.js` (`TIPOS`), `src/game/tienda.js` | catálogo de muebles: 1 InstancedMesh por tipo |
| Paneles de puerta (tablas o tela) | se generan en cada vano | `solidos.js` (`cerrarVanos`) | hoja de puerta cerrada |
| Pilares y columnas | `ruina_pilar`, vigas del bohío | kit | columnas |
| Losas y pisos | `losa_piedra`, `bloque_piedra`, `plataforma_piedra` (cajas de 12 tris con `KB3D_floorM`) | kit | piso de piedra, con UV a revisar |
| Escalera, barandas y sogas | escalera de la perforadora (primitivas); baranda, bita y soga del `muelle`; `cerca` de Construir | `v18/puerto.js`, `mapa/muelle.glb` | escalera y baranda |
| Herramientas y máquinas | `maquina_puerto.glb` (226 KB), perforadora de primitivas; banco de trabajo, máquina y transmisor del taller | `assets/models/personajes/`, `content/cap1/mundo.js:662` | Taller de Tuerca |
| Tuerca | `tuerca.glb` (292 KB, clips Idle, Hablar y Reparar; apariencias de operador, inventor y aliado) | `assets/models/personajes/`, `content/comun/personajes_v18.js` | NPC del taller |
| Nidos y perchas | nido de Construir; `G.fisica.addPercha`; perchas del arco | `fisica.js`, `arco.js` | — |

**Falta** (no existe en ningún sitio): paredes y esquinas modulares, ventanas con hueco real, techos interiores o cielos rasos, estantes, vitrinas y herramientas colgadas.

## 3. Sistemas que se reutilizan

| sistema | qué hace hoy | límite para interiores |
|---|---|---|
| **Construir** (`construir.js`) | fantasma verde o rojo a 3 m delante, rejilla opcional de 1 m, giro de 45°, colocar, quitar la pieza bajo el fantasma, deshacer (historial), foto PNG local; tope de 40 piezas (24 en bajo y Modo Escuela); 1 draw call por tipo | **sin rehacer**; **sin zonas autorizadas** (`validar` solo mira el agua, los colliders y la distancia a otras piezas); coordenadas del mundo y `H(x,z)` del terreno, así que no sirve para un piso de madera ni para una segunda planta; una sola lista global |
| **Guardado** | `S.construir = {v:1, piezas:[{t,x,z,r}]}`; el pack cap1 va en `version: 6` con `migrar()` encadenado (`content/cap1/pack.js:78`); sobre del motor `formato 2`, escritura atómica `.tmp`/`.prev` (`guardado.js`) | la clave nueva entra en `claves` y en `estado()`, y vale `null` en las partidas viejas (mismo patrón que `construir` y `tienda`) |
| **Interacción** (`interaccion.js`) | `{id,x,z,r,label,use,visible}`, la más cercana; `modo` para tomar la acción (lo usa Construir) | **solo 2D (x,z)**: dos pisos a la misma x,z chocan; hace falta `y` o filtrar con `visible()` |
| **Cámara** (`camara.js`) | 3.ª persona a 7,5 m; retrocede por la línea hasta salir del muro (rayo cada 0,15 m); se agacha bajo los aleros; near 0,12 | **no oculta techos ni muros**; en un cuarto de 3–4 m se pega a Vittata. En el bohío, «la cámara se queda fuera del muro» (`bohios.js`) |
| **Colisiones** | `solidos.js`: alturas en capas a 0,3 m (paredes, techos, `fino`, `percha`) a partir de cualquier malla, `agregar(obj)`, `recortar()`; `fisica.js` `pushOut` con círculos y cajas; desatasco automático | la celda de 0,3 m sirve para muros de 0,1 m (BM6). Los muebles deben llevar `sinSolido` o un collider simple |
| **Streaming / LOD** | zonas cerca (50–75 m) y lejos (650 m); por instancia, LOD 35–60 m y HD 45–120 m; liberación con histéresis; carga perezosa por módulo (`aDemanda` en `boot.js`) | un interior puede cargar con `aDemanda` al acercarse a la puerta (< 25 m) y soltarse al alejarse, como `bohios.js` (que en Escuela apaga los muebles a > 60 m) |
| **Espacio aparte** (`maze.js`, `flight.js`, `retos.js`) | instantánea de `G.S`, guardado suspendido, envolturas reversibles de física, cámara e interacción, y vuelta exacta | patrón listo para un «interior por transición»; falta el fundido (no hay un velo común) |
| **Reparación breve** | motor de habilidades de V18.1 (3 aciertos, engranaje del puerto, calmar el invento); coste con `G.objetos.has()/pay()` (`reparar.js`) | — |
| **Descubrimiento** | Diario, `lugares.js`, `secretos.js` (fragmentos, viñetas) | el dato tiene que llegar verificado y con fuente |

## 4. Licencias

| origen | dónde | estado |
|---|---|---|
| KitBash3D *Savage* y *Ancient Temples* (64 modelos, atlas, `tex/`, `tex_original/`, baldosas de `bohio_interior`) | `assets/models/edificios/*`, `entorno/bohio_interior.glb` | «licencia confirmada por Kelvin» (`docs/EDIFICIOS.md`). **Los recibos no están en el repo** (lo pide `docs/ASSET_AUDIT.md`). **Bandera:** se publican las JPG originales del kit (`tex_original/`, 27 MB) como archivos sueltos en el sitio. Hay que confirmar con el EULA de KitBash3D que se pueden servir así y no solo dentro del juego (decisión legal de Kelvin) |
| `canoa.jpg` | `edificios/tex/` | **origen desconocido** (`docs/EDIFICIOS.md`). Verificarla o reemplazarla. No usarla en interiores |
| Archmodels Vol. 61, palmeras y losas pintadas | no copiadas | `ASSET_AUDIT` dice que Kelvin los pagó, y `EDIFICIOS.md` que venían de `Torrents/`. **No usar** hasta tener recibo |
| Estructuras del mapa, `interior_bohio`, Tuerca, la máquina, NPC V18 | `tools/blender/*.py` (procedurales del proyecto) | propias. Las de interior usan baldosas KitBash (mismo estado que arriba) |
| three r128 (MIT), meshoptimizer (MIT, cabecera en el archivo) | `assets/vendor/` | sin problema |

## 5. Candidatos para los 3 pilotos

Ubicaciones y nombres a confirmar por Kelvin (canon e historia).

| piloto | edificio propuesto | por qué | clase | qué hay que hacer | horas-agente (estimación) | riesgos |
|---|---|---|---|---|---|---|
| **Casa editable** | El **bohío amueblado de Villa Raíz** (el más alto de los 13 a ×1,75; `bohios.js`) | es el único A: la puerta (1,95 m) ya deja pasar a Vittata, tiene muebles e interacción y está cerca del spawn. Hay 3 más en otras aldeas para «tu casa» | A | abrir en el sitio. Reemplazar los muebles procedurales por `bohio_interior.glb` o por el catálogo de Construir; zona autorizada = el círculo interior menos el paso de la puerta; ocultar el techo; guardar en `S.interiores` | 8–12 | interior pequeño (r ≈ 2,4 m): caben ~6–8 piezas; la puerta mide 0,62 m frente a 0,64 de cuerpo (QA-201); la búsqueda de vanos es inestable en `bohio_redondo` (QA-nuevo-br1-1) |
| **Taller de Tuerca** | **Torre vigía k300** de las Atalayas del Oeste (−61,3, 83,5; ×1,10), a 14 m de donde vive Tuerca (`arco.js` `SITIO.tue`: Tuerca «se queda aquí con sus faroles», `muelle.js`) | la base es un cuarto de tablas **sellado**: caras interiores 1,0/1,0, ~10 m² a su escala. Tuerca, la máquina y la reparación ya están en esa plaza | B | puerta en la base (panel transitable) + **interior por transición** a un taller modular más grande (paredes y piso del kit nuevo, banco, herramientas, `maquina_puerto.glb`). Reparación breve con el motor de 3 aciertos y coste `G.objetos` | 12–16 | Que el taller sea «más grande por dentro» es decisión de Kelvin. Alternativa: base abierta en el sitio, ~10 m², muy justa para la cámara. Que Tuerca tenga taller es canon nuevo: lo decide Kelvin |
| **Histórico** | **Mirador Yokahú** (`mirador_escalonado_1`, rol `mirador`, 14, 172; meta de la carrera y ruta de vuelo). Alternativa: la **Casita jíbara del Guardián** (`casa_paja_a_1`, −104, 138) | lugar real de El Yunque que ya se visita y ya tiene nombre en el juego. El dato verificable sale de una fuente oficial (USDA Forest Service: año y altura de la torre; **pendiente de verificar**, aquí no se escribe ninguna cifra) | C | conservar la fachada; puerta en la base + interior por transición con 2 áreas (sala de entrada y escalera o balcón). Ficha de descubrimiento opcional en el Diario con fuente | 12–16 | el modelo de Kelvin es un mirador tribal de madera y no se parece al Yokahú real, así que hay que decidir qué se cuenta. La alternativa (casa_paja_a, B) comparte modelo con la Casa editable B si se elige `casa_paja_a` |

**Total de los tres pilotos: 32–44 horas-agente** (estimación). Más lo compartido, que se reparte en la §7: núcleo de entrada y salida, cámara, guardado y kit modular, 16–22 h; QA y rendimiento, 4–6 h. **Total de la V18.4 hasta la aceptación: ≈ 52–72 horas-agente (estimación, no medida).**

## 6. Porcentaje de reutilización (método explícito)

**Método:** se lista cada **tipo de componente** que piden los tres pilotos (directiva §03–§08), sin contar por instancias. Cada uno vale 1 si existe y sirve tal cual (con el archivo como prueba), 0,5 si existe pero hay que adaptarlo y 0 si no existe.

**Reutilización = Σ valores / N.** También se da la cifra estricta, que solo cuenta lo que vale 1.

| # | componente | valor | evidencia |
|---|---|---|---|
| 1–3 | fachadas de los 3 pilotos | 1, 1, 1 | `bohio_redondo`, `torre_vigia` y `mirador_escalonado` (`_hd`) |
| 4 | vano transitable | 0,5 | bohío sí (`esBohioAbierto`); torre y mirador no |
| 5 | paredes y esquinas modulares | 0 | — |
| 6 | pisos | 0,5 | `losa_piedra` y `bloque_piedra` (cajas de 12 tris) |
| 7 | techo interior u ocultable | 0,5 | techo de hojas de Construir; techos fundidos en los modelos |
| 8 | hoja de puerta | 0,5 | paneles de `solidos.js` |
| 9 | ventanas | 0 | solo pintadas |
| 10 | escalera | 0,5 | escalera de `puerto.js` |
| 11 | columnas y vigas | 1 | `ruina_pilar`, vigas de `bohio_interior` |
| 12 | barandas | 0,5 | `cerca`, `muelle.glb` |
| 13 | atlas y materiales compartidos | 1 | `tex_hd/*`, atlas de `bohio_interior` |
| 14 | hamaca o cama | 1 | `bohio_interior`, Construir `hamaca` |
| 15 | asiento o banco | 1 | `bohio_interior` banco, `bench` |
| 16 | mesa | 1 | Construir `domino` |
| 17 | lámpara o farol | 1 | Construir `farol`, `arco.js` |
| 18 | estante o vitrina | 0 | — |
| 19 | herramientas y banco de trabajo | 0,5 | banco y máquina del taller de Vittata, `maquina_puerto.glb` |
| 20 | fogón y vasijas | 1 | `bohio_interior`, `bohios.js` |
| 21 | nido o percha | 1 | Construir `nido`, `addPercha` |
| 22 | plantas y decoración | 1 | bromelia, flores, helecho, banderines |
| 23 | aviso y Acción | 1 | `interaccion.js` |
| 24 | charla con el NPC (Tuerca) | 1 | `tuerca.glb`, `hablarTuerca` |
| 25 | reparación breve | 1 | habilidades V18.1, `reparar.js` |
| 26 | descubrimiento (Diario) | 1 | `lugares.js`, `secretos.js` |
| 27 | fantasma y validación | 1 | `construir.js` |
| 28 | encaje a la rejilla | 1 | `construir.js` (`REJ = 1`) |
| 29 | giro | 1 | `construir.js` (45°) |
| 30 | colocar y quitar | 1 | `construir.js` |
| 31 | deshacer | 1 | `construir.js` |
| 32 | rehacer | 0 | — |
| 33 | zonas autorizadas y objetos protegidos | 0 | — |
| 34 | guardado versionado y migración | 1 | `pack.js` v6, `guardado.js` |
| 35 | colisión de muros interiores | 1 | `solidos.js` `agregar` |
| 36 | cámara interior sin atravesar muros | 0,5 | `camara.js` (retrocede, no oculta) |
| 37 | ocultar techo o muro | 0 | — |
| 38 | interior por transición (espacio aparte + fundido) | 0,5 | patrón de `maze.js` y `flight.js`, sin fundido |
| 39 | carga bajo demanda | 1 | `streaming.js`, `aDemanda` |
| 40 | medición de rendimiento | 1 | `G.renderer.stats()`, streamingTest |

**Recuento:** N = 40. Valen 1: 25. Valen 0,5: 9. Valen 0: 6.

- **Reutilización ponderada:** (25 + 9 × 0,5) / 40 = **73,8 %**.
- **Reutilización estricta:** 25 / 40 = **62,5 %**.
- Por bloque, en ponderada: arte y geometría (1–13) 8/13 = 61,5 %; muebles (14–22) 7,5/9 = 83,3 %; sistemas (23–40) 14/18 = 77,8 %.

No se da una cifra de tris ni de bytes reutilizados, porque la geometría interior nueva aún no existe y no se mide algo que no existe. Se medirá en la etapa 4: tris de los interiores sacados del repo frente a tris nuevos.

## 7. Arquitectura recomendada y reparto

**Entrar y salir.** Se proponen dos modos, que el pack elige por edificio:
- **En el sitio** (clase A, y B si la escala alcanza): el vano se queda abierto (sin panel; se generaliza `esBohioAbierto` a una lista `interiores.abiertos`). Al cruzarlo (`G.interaccion`, con aviso «Entrar»), el techo y el muro del lado de la cámara pasan a `visible=false` (o a una capa que solo ve la cámara del sol) y el modo interior queda activo.
- **Por transición** (C, y B demasiado pequeño): con la Acción en la puerta, un velo de 0,4 s, instantánea de la posición (patrón de `maze.js`) y el interior modular se monta en un claro fuera del mapa jugable (cota alta o cayo, como el maze). Al salir, el velo y la vuelta exacta frente a la puerta, mirando hacia fuera.
- **Siempre:** la salida está a ≤ 6 m y marcada. Si Vittata se atasca, `desatasco` la saca a la puerta. Dentro no se vuela (el techo de vuelo es el techo del cuarto).

**Cámara dentro:**
- distancia 3,0–3,5 m, inclinación 35–45°, FOV 60;
- near 0,12 (no se toca);
- techo oculto;
- el muro que tapa a Vittata, oculto (rayo cámara→cabeza; el que corta se oculta, sin retroceder);
- el giro libre se conserva;
- `prefers-reduced-motion` también sin el velo animado.

**Construir dentro:**
- `construir.js` recibe un **contexto** `{ id, zona: polígono o círculo, piso: y, protegidos: [{x,z,r}], tope }`. Por defecto sigue el contexto del rincón de hoy.
- Dentro del contexto, `validar` añade: fuera de la zona → «Aquí no»; dentro de `protegidos` (puerta, paso de 1,2 m, objetos de misión, arquitectura histórica) → «Esto se queda libre».
- Altura = `piso` (no `H(x,z)`).
- Se añade **rehacer** (pila espejo de deshacer).
- Tope de muebles por interior: 12 (8 en bajo).
- Las habitaciones prediseñadas son listas de piezas que se aplican en bloque, con un solo deshacer.

**Guardado:** clave nueva `interiores` en `pack.js` (`claves`, `estado()`; `null` en las partidas viejas). Al subir el pack a v7, `migrar` solo la añade. `S.construir` no se toca.

```js
S.interiores = { v: 1, edificios: { '<id de instancia, p. ej. k212 o bohio@villa>': {
  piezas: [{ t: 'hamaca', x: 0.4, z: -1.2, r: 2, mat: 'madera' }],  // x,z en el espacio LOCAL del interior (sobrevive a reubicaciones del mapa)
  estado: { visitado: true, reparado: false, descubierto: [] } } } }
```

Lo que no se entiende (otra `v`, un `t` desconocido, números raros) se descarta pieza a pieza, como hace hoy `construir.js`. Las piezas no duplican geometría: 1 InstancedMesh por tipo y por interior activo.

**Presupuesto por interior:** se mide antes y después con `G.renderer.stats()`, en las máquinas de referencia de QA_GPU (iPhone 390×844 DPR 3 CPU ×4; Chromebook 1366×768 DPR 1 CPU ×6, «bajo»).

| | iPhone (medio) | Chromebook («bajo» o Escuela) |
|---|---|---|
| draw calls del interior | ≤ 20 (cáscara con atlas 1–3, muebles 1 por tipo ≤ 10, NPC ≤ 4) | ≤ 14 |
| tris del interior | ≤ 25 k | ≤ 12 k |
| memoria nueva | ≤ 6 MB (geometría ≤ 1,5 MB, atlas 1024 KTX2 de ~0,26 MB, ya compartido) | ≤ 4 MB |
| mundo de fuera con transición | se suspende el dibujo de las zonas (el streaming mantiene lo cercano) | igual |

En el sitio, la vista total sigue bajo el tope de 150 draw calls del streamingTest. No se promete una cifra de FPS en todos los Chromebook.

**Reparto en tareas con archivos disjuntos (etapas 2–4, para el equipo de Grok):**

| tarea | dueño de (archivos) | depende de | horas (est.) |
|---|---|---|---|
| T1 · Núcleo de interiores: puerta, en el sitio o por transición, velo, salida segura y registro de edificios | `src/game/interiores.js` (nuevo), `content/cap1/interiores.js` (nuevo, datos: ids, modo, puerta, zona, protegidos) | — | 8–10 |
| T2 · Cámara interior: modo interior, ocultar techo y muro | `src/engine/camara.js` | T1 (API `G.interiores.activo()`) | 4–6 |
| T3 · Kit modular (pared, esquina, piso, cielo, puerta, ventana, escalera, baranda, estante, vitrina, herramientas) con el atlas Savage existente | `tools/blender/interior_kit.py` (nuevo), `assets/models/entorno/interior_kit*.glb` | — | 8–12 |
| T4 · Construir con contexto, zonas, protegidos y rehacer | `src/game/construir.js` | T1 (contexto) | 5–7 |
| T5 · Guardado `S.interiores` v1, pack v7 y migración | `content/cap1/pack.js`, `src/engine/guardado.js` (solo si hace falta) | — | 3–4 |
| T6 · Piloto Casa editable (bohío A, `bohio_interior.glb`) | `src/game/bohios.js` | T1, T2, T4, T5 | 4–6 |
| T7 · Piloto Taller de Tuerca (torre k300, interior modular, reparación) | `src/game/v18/taller_tuerca.js` (nuevo) | T1, T3; lee la API de `arco.js` sin editarlo | 6–8 |
| T8 · Piloto Histórico (mirador, 2 áreas, ficha verificada) | `src/game/historico.js` (nuevo), textos en `content/cap1/en.js` (coordinar con `historico.js`) | T1, T3, datos verificados por Kelvin | 6–8 |
| T9 · Vanos abiertos por lista y sólidos del interior | `src/engine/solidos.js` (`esBohioAbierto` → lista) | T1 | 2–3 |
| T10 · QA y rendimiento antes y después, video de aceptación | `tools/build/v184_*.js|py` (nuevos), `docs/equipo/QA_GPU.md` | T6–T8 | 4–6 |

**Orden:**
1. En paralelo: T1, T3 y T5.
2. Después: T2, T4 y T9.
3. Después: T6, T7 y T8, en paralelo.
4. Al final: T10.

Cada tarea solo edita sus archivos. `src/boot.js` (carga `aDemanda` de `interiores.js`, `historico.js` y `taller_tuerca.js`) es del coordinador: una sola edición al final de T1.

**Decisiones para Kelvin (se dejan anotadas, no se toman aquí):**
1. ¿Los interiores pueden ser más grandes que la fachada (por transición)?
2. Canon: ¿Tuerca tiene un taller en las Atalayas?
3. Histórico: ¿Mirador Yokahú o Casita jíbara? Y el dato con su fuente.
4. Licencia KitBash: ¿se pueden servir las JPG sueltas?
5. `canoa.jpg`: ¿se verifica o se reemplaza?
