# Decisión visual 2026: «Vibrant Toon Refinado» (prototipo)

Resumen fiel de `Amazona_Verse_Decision_Visual_Vibrant_Toon_2026.docx` (dirección de arte, 26-oct-2026; para Fernando y Claude Code).
Es una aprobación de dirección artística, **no** una autorización para reemplazar personajes ni para aplicar el preset a producción.

## Decisión ejecutiva
- Se selecciona la variante **TOON** de la prueba A/B (`docs/equipo/LOOK_VIBRANTE.md`, lámina `docs/img/look_comparacion.png`) como base de
  una nueva identidad visual 2026: colores vivos, luz cálida, materiales estilizados y buena legibilidad en PC y móvil.
- **No** se aprueba aplicar el preset tal cual: debe refinarse y superar pruebas de rendimiento. Fernando decide la integración después
  de revisar las capturas.
- Lectura de las cuatro franjas de la A/B: fábrica preserva detalle pero se percibe menos alegre; vibrante tiene intensidad útil pero hay
  que controlar los verdes excesivos; soleado da luz natural pero poca diferenciación artística; toon es el mejor punto de partida
  (cielo claro, siluetas y color definidos) pero necesita optimización. El objetivo no es saturarlo todo: es una paleta coherente.

## Regla innegociable: los personajes originales
- El estilo de la escena puede cambiar; los modelos de Vittata y de las otras cotorras **no**: geometría, rig, pico, ojos, proporciones,
  expresiones y animaciones se mantienen. Las 22 pieles actuales son la base; no se sustituyen con imágenes generadas.
- Tratamiento permitido: revisar materiales y texturas para que respondan mejor a la luz; ajustar la saturación por especie con límites
  (se conservan los patrones y colores que identifican a cada una); realzar rostro y ojos con iluminación y contraste, sin cambiar su
  forma; la rareza se muestra con aura, partículas e interfaz, sin convertir a todas las especies en aves azules o doradas.

## Entregables de la prueba controlada
1. Preset alternativo «Vibrant Toon Refinado», reversible con una bandera de configuración.
2. Capturas de las mismas cámaras y horas de luz en aldea, El Yunque, río, ciudad y criadero.
3. Unificar vegetación, rocas, ruinas, cielo, agua y sombras sin modificar la geometría de los personajes.
4. Minimapa, misiones, controles, criadero, huevos, Retos y alimentación quedan intactos.
5. Medir frame time, FPS, memoria y estabilidad en computadora y móvil, antes y después.
6. Capturas A/B y reporte de regresiones; Fernando decide la integración tras la revisión visual.

## Riesgo detectado
La tabla de la prueba muestra que toon no mejora todo: en «ciudad» dio ~70,8 ms por cuadro frente a ~31,3 ms de fábrica. Son cifras de
esa captura, no un benchmark universal: investigar la causa y repetir en el mismo equipo antes de publicar.

## Criterios de aceptación
- Vittata destaca claramente contra vegetación, ruinas y agua, incluso en pantalla pequeña.
- Colores vivos sin quemar las altas luces ni convertir el bosque en un bloque verde uniforme.
- Los indicadores del minimapa y las tareas siguen legibles.
- Sin degradación significativa de rendimiento en móvil respecto a la versión actual.
- Todos los assets originales conservados y cambios reversibles.

**Decisión final:** se aprueba la dirección «Vibrant Toon Refinado» como prototipo. La publicación depende de las comparativas reales y
del rendimiento.

---

# Prototipo entregado (26-oct): preset `vibrant_toon`

Lo que hay: `?look=vibrant_toon` (o chip «Vibrant Toon» en la sección oculta «Look (prueba)» de la pausa). `DEFECTO` sigue en `null`:
el juego publicado no cambia ni un byte. Qué toca y cómo se revierte: `docs/equipo/LOOK_VIBRANTE.md` (sección «Vibrant Toon Refinado»).
Capturas A/B de las mismas cámaras: `docs/img/vtr_<fabrica|vibrant_toon>_<aldea|yunque|rio|ciudad|criadero>.png` y la lámina
`docs/img/vtr_comparacion.png`. Personajes: solo un `#define AV_RIM` (borde de luz) en los materiales Standard de las mallas con
esqueleto; geometría, rig, pieles y texturas intactos, y el define desaparece al quitar el look.

## Rendimiento: el «70,8 ms en ciudad» era ruido de medida, no el look
- **Causa.** La medida original era una sola ventana de 90 cuadros en un Chrome sin interfaz, en una Mac compartida con otros
  agentes. Repetida hoy, la misma escena y el mismo look dan cifras de 22,8 a 108,5 ms entre dos corridas consecutivas (toon,
  ciudad), y fábrica 27,8 frente a 62,8 ms; la mediana es siempre 16,7 ms (vsync) con rachas de cuadros de 200 ms exactos (el
  rAF de Chrome cae a 5 Hz cuando otro proceso le quita la GPU). No hay programa extra por cuadro, ni material duplicado:
  los draw calls y los triángulos son idénticos en los cuatro looks y la rampa toon es un `smoothstep` en lugar de un `saturate`.
  Las texturas a 512 px bajan la memoria estimada de 226 a 194 MB (−32 MB) y no cuestan tiempo (se encogen una vez).
- **Lo que sí se corrigió en `look.js`** (costes puntuales, no por cuadro): el barrido de materiales nuevos marcaba `needsUpdate`
  en todos (recálculo de la clave del programa) y la hoja refinada o el rim podían compilar dos veces (una sin refinar en su
  primer cuadro y otra al barrerla 90 cuadros después, y r128 reutilizaba el programa viejo por la misma clave). Ahora: el barrido
  corre en el mismo cuadro en que llega contenido nuevo (cambia el número de geometrías o texturas del renderer), solo recompila
  lo que cambia de programa (hoja refinada, define del rim, o un material compilado antes del look, detectado por la clave del
  programa en `renderer.properties`), y la hoja refinada lleva su propia clave (`|ref`).
- **Medida nueva, mismo equipo y mismas cámaras** (`tools/build/look_capturas.py`: 180 cuadros con media, mediana y p90; y
  además una medida síncrona dentro de la página, `drawScene` + `readPixels`, que mide el coste real del cuadro sin el tope del
  vsync ni las rachas de 200 ms; cambiando de look en la misma pestaña y la misma cámara, dos series por look):

| Equipo (lienzo) | Vista | Fábrica (mediana · p90) | Vibrant Toon (mediana · p90) | Toon |
|---|---|---|---|---|
| Escritorio, alto, 2048×1536 (dpr 2), post | ciudad | 21,3 · 22,4 ms / 21,2 · 22,3 ms | **17,8 · 18,2 ms / 17,8 · 18,2 ms** | 17,8 · 18,6 ms |
| Escritorio, alto, 2048×1536 (dpr 2), post | aldea | 17,5 · 17,8 ms / 18,8 · 20,0 ms | **16,6 · 16,8 ms / 17,0 · 18,3 ms** | 17,4 · 18,3 ms |
| Móvil emulado (375×812, táctil, dpr 1,5 → 562×1218), alto, post | ciudad | 5,9 · 7,9 ms / 7,1 · 10,3 ms | 6,5 · 9,1 ms / 6,8 · 9,3 ms | 6,4 · 9,3 ms |
| Móvil emulado | aldea | 7,5 · 10,5 ms / 8,6 · 11,2 ms | 7,7 · 10,2 ms / 8,2 · 10,1 ms | 8,4 · 11,8 ms |

  Con rAF (180 cuadros, misma pestaña): mediana 16,7 ms (60 Hz) en las tres variantes y las dos vistas; p90 fábrica 18,5–31,6 ms,
  vibrant_toon 16,8–17,4 ms. Draw calls: 109 (ciudad) y 117 (aldea) en los tres looks; heap JS 65–120 MB sin diferencia por look;
  texturas estimadas 183–184 MB (fábrica) frente a 151–152 MB (vibrant_toon y toon). **Ciudad, antes y después: 21,3 ms de fábrica
  → 17,8 ms con vibrant_toon en escritorio (−16 %); en móvil emulado 5,9–7,1 → 6,5–6,8 ms (igual dentro del ruido).** Nota: la
  emulación de móvil corre en la GPU de la Mac; en un celular real la relación se mantiene (misma geometría y draw calls, menos
  memoria de texturas), pero la cifra absoluta no, y hay que medirla allí antes de publicar.
- Las cifras bajo cada imagen de `vtr_comparacion.png` son las del Chrome sin interfaz (series con rachas de 200 ms): sirven como
  recordatorio de la mediana (16,7 ms en todas), no como comparación.

## Informe de regresiones (con `?look=vibrant_toon` activo, calidad «alto», escritorio)
Baterías del juego corridas en la misma pestaña con el look puesto (la interfaz es DOM: el look solo toca el lienzo 3D):

| Qué | Resultado | Nota |
|---|---|---|
| Minimapa (`AV.minimapaTest`) | 36/36 | flecha, objetivo, metros, marcadores y mapa grande legibles; es DOM/canvas 2D, sin gradación |
| Controles y teclas (`controlesTest`, `teclasTest`) | 19/19 · 18/18 | guía «¡Así se juega!», botones táctiles (móvil emulado, captura) y teclado iguales |
| Misiones | HUD del capítulo, objetivo y «PRÓXIMO» legibles en las capturas de escritorio y móvil | el texto va fuera del lienzo |
| Retos (`retosTest`) | 87/87 | |
| Criadero y huevos (`criaderoTest`) | 49/49 | el criadero tiene su propio renderer; sin tone mapping no recibe la gradación: su captura es idéntica en fábrica y vibrant_toon (`vtr_*_criadero.png`); el polluelo/Vittata del nido no lleva rim (no se recorre su escena) |
| Alimentación / Banquete (`banqueteTest`) | 42/43 | el fallo («otros módulos escriben en clock y marcador») es el mismo de fábrica, ya anotado en el registro del 26-oct; ajeno al look |
| Look (`lookTest`) | 36/36 | con las 10 comprobaciones nuevas del refinado; al quitar el look todo vuelve byte a byte (chunks, luces, cielo, tintes, define del rim, onBeforeCompile de la hoja, texturas) |
| Errores de consola | 0 | en las baterías, en las capturas y en la lámina |

Pendiente para Fernando (integración): decidir si vibrant_toon pasa a `DEFECTO`; en ese caso revisar los colores de las paradas
educativas y del cómic, mirar el criadero (hoy sin gradación: ¿se quiere coherente con el mundo?) y medir en un celular real.
Nota de coordinación: el carril W cambia `renderer.js` (gradación de fábrica en el tone mapping por niveles, `CustomToneMapping`);
`look.js` inyecta su gradación después de `toneMapping()` en `tonemapping_fragment`, así que ambas se componen (la de fábrica y la
del look se suman); si W fija su gradación en `CustomToneMapping` para «bajo» y «medio», el look seguirá aplicando la suya encima.
Conviene que, al integrar, el look sustituya la de fábrica en vez de sumarse (una línea en `chunkTone`: usar `ACESFilmicToneMapping`
directamente cuando haya look). Anotado para W; no se tocó `renderer.js`.


---

# Integración (26-oct, C11): Vibrant Toon Refinado es el look de fábrica
Kelvin decidió por escrito («aquí mando yo, autorízalo») que el Vibrant Toon Refinado pasa a ser el look de fábrica para todos; la
aprobación de Fernando ya no hace falta (`docs/DECISION_LOG.md`).
- `DEFECTO = 'vibrant_toon'` en `src/game/look.js`. `?look=fabrica` (o el chip «Fábrica» de la pausa, que se recuerda en la sesión)
  muestra el original para comparar; `vibrante`, `soleado` y `toon` siguen. Un nombre desconocido cae en el de fábrica actual.
- `boot.js` (commit mínimo, solo mis dos líneas): look.js se carga al arrancar, no a los 7 s. Se aplica mientras la portada sigue
  abierta (comprobado: `AV.look.actual === 'vibrant_toon'` con `#title` abierto), así que el jugador nunca ve el cambio de color;
  el mundo no se dibuja con la portada o el creador delante (`renderer.js`, `worldHidden`). Descarga inicial: +34 KB (look.js).
- La gradación del look **sustituye** a la de fábrica (W1) en vez de sumarse: con un look activo `tonemapping_pars_fragment` deja
  `CustomToneMapping = ACES puro` y los uniformes `uSat/uCon/uTint` del pase de gradación del composer se ponen a 1 (viñeta y rayos
  intactos); al quitar el look vuelven `post.GRADO` y el chunk original. `renderer.js` no se tocó; el cielo vivo (C1), el clima y el
  atardecer (C9) siguen mandando sobre `uCenit/uHorizonte/uSolCol` (el look solo los repone con el cielo quieto).
- Criadero: tiene renderer propio (ACES, exposición 1,0) y comparte los ShaderChunks, así que recibe la gradación del look y no
  desentona (captura `docs/img/vtr_defecto_criadero.jpg`: polluelo, nido y cápsulas legibles); el polluelo no lleva rim (su escena
  no se recorre), como Vittata en el creador. Si se quiere el rim también ahí, es una línea en `criadero.js`/`showcase.js` (zonas ajenas).
- Pruebas: `lookTest` 42/42 (nuevas: DEFECTO, chip «Fábrica», sustitución de la gradación y vuelta de `post.GRADO`); `missionTest`
  68/68 con la comprobación «Juego y creador con el mismo color (sRGB + ACES)» hecha robusta: espera a que el post se asiente
  (`post.cargando`) y acepta ACES o CustomToneMapping-con-ACES (W1), que es lo que hay mientras el composer carga o en «bajo»;
  otro encoding u otro tone mapping sigue fallando (fallaba intermitente con la Mac cargada, 61/62, y bloqueó la publicación de 5b40323).
- Medidas (misma pestaña, misma cámara de ciudad, medida síncrona `drawScene` + `readPixels`, dos series), antes = `?look=fabrica`
  (lo que se publicaba) y después = el nuevo defecto:

| Equipo | Antes (fábrica) mediana · p90 | Después (vibrant_toon) mediana · p90 |
|---|---|---|
| Escritorio, alto, 2560×1440 (dpr 2), post | 28,0 · 29,8 ms / 26,7 · 28,4 ms | **23,2 · 26,0 ms / 20,1 · 24,2 ms** (−20 %) |
| Móvil emulado (375×812 táctil, dpr 1,5 → 562×1218), medio, post | 6,2 · 7,9 ms / 9,9 · 13,3 ms | **4,9 · 6,5 ms / 4,9 · 6,3 ms** |

  Draw calls iguales (105); texturas estimadas 227 → 195 MB; heap JS igual (116–121 MB). Capturas del nuevo defecto (5 cámaras):
  `docs/img/vtr_defecto_{aldea,yunque,rio,ciudad,criadero}.jpg`; la mejor para enseñar: `vtr_defecto_ciudad.jpg` (ruinas cálidas con
  relieve, mar azul, cielo sin quemar).
