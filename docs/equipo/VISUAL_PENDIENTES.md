# Visual: lo que todavía no se parece al render de 2022 (BE1, 27-oct)

Verificación tras los cambios del día (BB1 agua, BB2 sendas y roca, AY1 nombres), **sin cambiar código**.
- Build `HEAD-a766950` (lo commiteado; no incluye lo que AW3 `src/engine/dosel.js` y AY2 `plazas_asentamientos.py` tienen sin commit).
- Las 13 vistas de `tools/build/mapa_vistas.json` (las 12 de la auditoría más `render2022`), look por defecto, `?clima=sol`; escritorio en «alto» y móvil (390×844, dpr 2) con la calidad que elige el juego.
- Láminas: `docs/img/be1_<vista>.jpg` (escritorio) y `docs/img/be1_movil_<vista>.jpg`. Orden fijo, de izquierda a derecha: **antes** (`mapa_audit_*`, si hay vista equivalente) · **render 2022** (`mapa_audit_original_2022.jpg`) · **ahora**. Sin rótulos: el Python de Blender no trae FreeType.
- Cómo se hizo: `look_capturas.py --raiz <build>/site --looks fabrica --vistas-json …` (con y sin `--movil`, la clave `_nota` quitada del JSON). Luego un compositor con OpenImageIO, de un solo uso, que quedó en `tools/build/salida/be1/`.

## Qué mejoró desde la auditoría
- **Agua (BB1):** río y pozas turquesa con borde claro y orilla de arena. Se nota en todas las vistas (`be1_v_meandros`, `be1_v_mina`, `be1_v_este`); antes era gris verdoso.
- **Sendas y roca (BB2):** las sendas ya no son rojo saturado sino tierra parda (`be1_s_meandros`), y la roca tiene estratos y musgo (`be1_v_lomas`, `be1_v_yunque`).
- **Suelo desde el aire:** el verde lima liso de la auditoría es ahora un verde oliva moteado (`be1_aerea`).

## Pendientes, de lo que más se nota a lo que menos

| # | Qué falta | Dónde se ve | Dueño propuesto |
|---|---|---|---|
| 1 | **No hay dosel.** El render es una alfombra cerrada de copas, con el suelo invisible salvo en claros y sendas. Ahora hay árboles sueltos (palmas y «palitos» de tronco blanco) sobre césped, y desde 250 m la isla se lee como pradera. Es la diferencia número uno con mucha distancia. | `be1_render2022`, `be1_aerea_sur`, `be1_aerea_media`, `be1_movil_render2022` | API, flora: **carril AW (AW3, `dosel.js`, sin commit, en curso)**. BE2 no debe pisarlo. |
| 2 | **Las paredes de roca dominan el paisaje.** En el render los meandros son gargantas cubiertas de selva hasta el borde, y la roca solo asoma bajo las ciudades. Ahora hay escalones grises desnudos de decenas de metros en terrazas por toda la isla, con bandas oscuras muy marcadas en el Yunque. | `be1_aerea_sur`, `be1_v_lomas`, `be1_v_yunque`, `be1_render2022` | API, terreno: vegetación o musgo que cubra las paredes de pendiente media, y la roca desnuda solo en las verticales altas. Encaja como BE2. |
| 3 | **Las ciudades de piedra son de un amarillo arena plano.** En el render son blanco crema, con sombra propia y una base de roca gris. Ahora son una masa amarilla saturada, sin frisos a media distancia. | `be1_v_yunque`, `be1_v_este`, `be1_aerea_sur` | **Grok** (edificios, G6 `_hd`). |
| 4 | **Las aldeas no se leen desde el aire.** En el render cada aldea es un grupo de tejados rojos sobre una plaza de tierra con borde nítido. Ahora son motas rojas u oscuras dispersas entre los árboles. | `be1_render2022`, `be1_aerea_sur`, `be1_v_rio_oeste` | Tejados y escala: **Grok**. Plazas de tierra: **AY2** (en curso, sin commit). |
| 5 | **Al agua le falta el azul del render.** El turquesa de BB1 es más claro y verdoso que el azul cobalto saturado del render, y la franja de arena es más ancha. En el render la selva llega casi al agua, con un borde fino y brillante. | `be1_render2022`, `be1_v_meandros`, `be1_v_este` | API, agua: retoque de BB1 (color profundo y arena más estrecha en los meandros; las playas, como están). |
| 6 | **Falta profundidad de luz.** El render tiene oclusión ambiental fuerte entre las copas y en las gargantas, con alto contraste. Ahora la luz es plana: verdes uniformes, sin sombra de contacto a media distancia, y el cielo da un tono azulado y lavado a la isla. | todas las aéreas | API, luz (sin tocar el look global de `ESTANDAR_VISUAL.md`: AO o sombra de dosel en el terreno). |
| 7 | **El suelo desde muy alto da ruido.** El moteado oliva y pardo de la cenital forma un muaré de manchas que en el render no existe (allí es copa). Desaparece si se resuelve el punto 1. | `be1_aerea` | API, terreno, tras el punto 1. |
| 8 | **El móvil se ve peor que el escritorio.** La calidad baja a «bajo», así que hay impostores de palito blanco, menos árboles y paredes más grises. Además usa 443–447 MB de texturas estimadas en las vistas aéreas (264 MB en la Villa), muy por encima del presupuesto. | `be1_movil_*` | API: **BE5** (texturas ≤ 260 MB). Los atlas de edificios, a Grok. |
| 9 | **Hay restos de senda roja en la vista cenital.** Quedan líneas finas rojizas por toda la isla; en el render las sendas son tierra parda ancha entre claros. | `be1_aerea` | API, terreno (resto de BB2), baja prioridad. |
| 10 | **Curvatura del horizonte.** En las aéreas del sur el mar se curva como un cuenco por el FOV ancho. El render usa una cámara casi ortográfica. Es estético, no un error. | `be1_aerea_sur`, `be1_aerea_media` | API, cámara; opcional, solo para la foto de comparación. |

A pie (`be1_s_villa`, `be1_s_meandros`) el juego ya se ve bien y coherente; los pendientes son casi todos de la lectura aérea y de media distancia.

## BE2 (27-oct, 6cc717c)
Arreglados en el terreno y el agua los puntos **2, 5, 6, 7 y 9** (detalle en la fila BE2 de `TAREAS_API.md`; antes · después en `docs/img/be2_*`). Siguen: el 1 (AW3), el 3 y el 4 (Grok y AY2), el 8 (BE5) y el 10 (opcional). Lo vuelve a revisar BE7.

## Medidas (móvil, calidad automática, Mac muy cargada: carga de 16 a 33)
Calls de 33 a 95, triángulos de 180 k a 560 k (`s_meandros`), de 47 a 77 programas y texturas de 264 a 447 MB. Los ms no sirven: había 6 agentes probando a la vez. 0 errores de consola en las 26 capturas.

## BE7: segunda pasada (27-oct, build b83331d)
Mismas 13 vistas, en escritorio y en móvil, con el mismo método que BE1. Láminas: `docs/img/be7_<vista>.jpg` y `be7_movil_<vista>.jpg`, en orden **BE1 (a766950)** · **render 2022** · **ahora (b83331d)**. 0 errores de consola en las 26 capturas. El móvil emulado ahora elige «alto», no «bajo» como en BE1, así que se parece al escritorio.

**Qué mejoró desde BE1:** (1) **ya hay dosel** (AW3): desde 250 m la isla se lee como selva y no como pradera, y es el salto más grande; (2) las paredes de pendiente media están cubiertas de selva colgante (BE2); (5) el río es azul cobalto con borde fino (BE2); (6, 7, 9) más sombra en las gargantas, sin muaré en la cenital y sin rastro de senda roja.

**Pendientes, de lo que más se nota a lo que menos:**

| # | Qué falta | Dónde se ve | Dueño propuesto |
|---|---|---|---|
| 11 | **Troncos blancos («palitos»).** A media distancia, los troncos claros del kit (con el tinte de corteza 0,74) forman un enrejado blanco bajo las copas; en el render no se ven troncos. | `be7_v_meandros`, `be7_v_lomas`, `be7_aerea_sur` | API, flora. **Arreglado en BE7.** |
| 12 | **El dosel parece plástico liso.** La manta de AW3 es lima, lisa y sin copas individuales; en el render es una alfombra oscura de copas con huecos sombreados. | `be7_aerea_sur`, `be7_render2022`, `be7_v_lomas` (al fondo) | API, flora. **Arreglado en BE7** (copas y oclusión en el shader). |
| 13 | **Impostores con tronco claro.** Entre 110 y 250 m los impostores conservan el tronco pálido del atlas (el mismo problema que el 11, de lejos). | `be7_aerea_sur`, `be7_render2022` | API, flora. **Arreglado en BE7** (mismo tinte al hornear el atlas). |
| 3 | Ciudades de un amarillo arena plano, sin la base de roca gris. Ahora es lo que más se nota. | `be7_v_yunque`, `be7_aerea_sur` | **Grok** |
| 4 | Aldeas poco legibles desde el aire. Las plazas de AY2 ayudan, pero los tejados siguen siendo motas. | `be7_render2022`, `be7_aerea_sur` | **Grok** |
| 14 | **La pared del Yunque** sigue siendo un acantilado pardo de 100 m con bandas; en el render la roca bajo las ciudades es gris claro y más corta. | `be7_v_yunque`, `be7_aerea_sur` | API, terreno (color de la roca alta), media prioridad. |
| 8 | Texturas: 443–447 MB estimados en todas las vistas, en escritorio y en móvil. | `be7_movil_*` | API: **BE5** |
| 10 | Curvatura del horizonte en las aéreas del sur. | `be7_aerea_sur` | API, cámara; opcional |

**Lo que arregló BE7 (11, 12 y 13)**, en `src/engine/vegetacion.js` y `src/engine/dosel.js`, solo en tintes y shaders, sin cambios en la descarga ni en los triángulos. Láminas en orden antes · 2022 · después: `docs/img/be7_antes_despues_{render2022,aerea_sur,v_meandros,v_lomas}.jpg`.
- 11: la corteza pasa a un tinte pardo (0,5; 0,45; 0,39).
- 12: el dosel lleva copas de ~5 m con ruido de valor de dos octavas (×0,68 a ×1,1) y huecos más oscuros según la altura sobre el suelo (×0,5 a 0,5 m, ×1 a 7,5 m).
- 13: los impostores se hornean con el mismo tinte de corteza.
