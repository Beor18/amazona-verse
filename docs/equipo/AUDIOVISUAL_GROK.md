# Audiovisual con Grok · coordinación (directiva V11 de Kelvin, 28-oct-2026)

Carril **AV** dentro del sistema de siempre: el tablero es `docs/equipo/TRABAJO_SIMULTANEO.md`, los pedidos van en `docs/equipo/PEDIDOS.md`, las decisiones en `docs/DECISION_LOG.md` y la identidad en `docs/GAME_FIRST.md`. Este archivo solo guarda lo propio del audiovisual: capacidades, biblia visual, storyboard, prompts, pruebas y costos. **El mapa sigue primero**: mientras no esté aprobado, aquí solo hay trabajo preparatorio.

## 0. Aclaraciones de Kelvin (28-oct, tarde) · mandan sobre lo demás
- **Kelvin tiene Grok Ultra** y ya lo usa en Cursor. No se le vuelve a preguntar por el plan. Él ya probó Grok Imagine: **1080p, 15 s por video, varias imágenes de referencia, buen resultado**.
- **Kelvin aprueba; no opera.** Los agentes preparan referencias, prompts, ajustes, archivos y procedimientos. Cada prueba es un **paquete listo** (`docs/equipo/av/paquetes.json` → `tools/av/armar_paquetes.py` → un `.zip` por prueba con las referencias numeradas, `PROMPT.txt` y `ACEPTACION.txt`).
- **No se usa el mapa sin terminar** en los videos: hasta que Kelvin lo apruebe, las referencias del mundo son sus imágenes meta (`ciudad_tepuy_meta_kelvin.jpg`, `ciudad_tepuy_render2022.jpg`) y los renders oficiales.
- **El logo no bloquea nada:** provisional, el de la web (`web/assets/favicon.svg` y la marca de `web/assets/og.jpg`); el vectorial se resuelve después, igual al aprobado.
- **Vittata:** el modelo oficial manda. Grok puede generarla en cinemáticas si mantiene la identidad (prueba A); si no lo hace de forma constante, se usan renders del modelo oficial.
- **Producción híbrida:** gameplay real + Blender + Grok Imagine; la mejor calidad, no la mayor cantidad de clips.
- **Sin compras nuevas** hasta demostrar que hacen falta.

## 1. Capacidades reales de Grok (investigado el 28-oct; confirmar en la cuenta de Kelvin)

**Primero, una distinción que cambia todo:**
- **Grok en Cursor** es el modelo que programa. Va con el plan de Cursor. **No genera video ni imágenes.**
- **Grok Imagine** (imagen y video) vive en **grok.com / la app de Grok / X**, con la suscripción de Kelvin, y se usa **a mano**.
- **La API de xAI** (`grok-imagine-video`, `grok-imagine-video-1.5`) se paga **aparte, por segundo**, con su propia clave. **La suscripción no incluye la API.** Es la única vía para automatizar desde Cursor.

| Punto | Lo que dicen las fuentes (28-oct) | Estado |
|---|---|---|
| Nombre del plan | Las fuentes públicas hablan de SuperGrok (~$30/mes), SuperGrok Plus (~$100/mes) y Heavy; **no encontré un plan llamado «Grok Ultra»** | **Kelvin confirma (28-oct): tiene el plan Ultra de Grok**, el más alto de su cuenta. Sus límites exactos (1080p, duración, clips por día) se anotan en la prueba 0 |
| Duración por clip | 6 s (planes bajos), 10 s (SuperGrok y más), hasta 15 s según fuente; la API acepta 1–15 s | Por medir en la cuenta |
| Resolución | 480p/720p en los planes normales; **1080p en un plan superior o con Imagine 1.5** (fuentes en desacuerdo) | Por medir: es la prueba 0 |
| Desde imagen | Sí (imagen → video). Imagine 1.5 admitiría hasta 7 referencias (sin confirmar oficialmente) | Por medir |
| Audio | Genera audio con el video | Por medir |
| Límite de uso | No oficial: ~15–20 videos por día en SuperGrok, con frenos en hora pico | Por medir |
| API (precio) | Docs de xAI: 1.5 a **$0,08/s**; tablas de terceros: $0,08 (480p), $0,14 (720p), $0,25 (1080p) por segundo; base $0,05/s; se cobra también la imagen de entrada; 1.5 aparece como *preview* | Verificar en la consola de xAI antes de gastar |
| Uso comercial | Según los términos de consumo citados por terceros, **el usuario es dueño de lo que genera**, pero da a xAI una licencia amplia (también para entrenar; hay opción para no ceder). El copyright de material hecho por IA es dudoso según el país | **Kelvin lo revisa** en x.ai/legal; ver riesgos |

Fuentes: [docs xAI · Imagine Video 1.5](https://docs.x.ai/developers/models/grok-imagine-video-1.5), [xAI · Imagine API](https://x.ai/api/imagine), [Build Fast with AI](https://blog.buildfastwithai.com/supergrok-video-image-generation-2026-speed-pricing-math-comparison), [The Rundown](https://www.therundown.ai/tools/grok-imagine), [Vmake](https://vmake.ai/blog/grok-xai-video-generation-length-limit), [ofox · precios por resolución](https://ofox.ai/blog/grok-imagine-video-api-pricing-by-resolution/), [términos de xAI](https://x.ai/terms-of-service), [análisis de propiedad (hyperonomy)](https://hyperonomy.com/2025/12/03/who-owns-grok-generated-content/).

**Conclusión:** con la suscripción se pueden hacer **pruebas y clips cortos a mano, sin costo extra**. Si sirven para un comercial en 1080p, lo dice la prueba 0. La automatización desde Cursor solo es posible con la API, y eso **es un gasto nuevo** que aprueba Kelvin.

## 2. Recursos oficiales que ya tenemos (inventario)

| Tipo | Dónde | Uso |
|---|---|---|
| Vittata 3D oficial (modelo y rig) | `assets/models/vittata.glb`, `vittata_base*.glb`, `vittata_mounts.json` | **La única fuente de Vittata** en videos: render o captura del juego |
| Vittata 2D | `assets/vittata.png`, `web/assets/img/vittata.png`, `docs/img/vittata3d_*.png` (idle, celebrate, welcome) | Referencia para prompts y portada |
| Poses de Vittata | `assets/manga/poses/vittata/` (22 PNG) | Storyboard y referencias de expresión |
| Especies | `assets/presets/` (8 renders 2D), `assets/textures/pieles/` (22 pieles), `content/comun/especies.js` (36 fichas con fuente) | Personajes; solo especies con render oficial |
| Iguaca y el Guardián | `assets/luma.png`, `web/assets/img/iguaca.png`, `assets/guardian.png` | Personajes secundarios |
| Mundo (metas de Kelvin) | `docs/img/ciudad_tepuy_meta_kelvin.jpg`, `ciudad_tepuy_render2022.jpg`, `mapa_audit_original_2022.jpg`, `ciudad_referencia_2022.jpg` | Dirección de arte del mundo |
| Mundo (juego hoy) | `docs/img/` (capturas por vista y fecha), `tools/build/mapa_vistas.json` (cámaras guardadas) | Planos aéreos reales, repetibles |
| Web | `web/assets/img/` (capítulos 1–6, flora, minijuegos, hero), `web/assets/video/aprender.*` | Portada actual |
| Bandera | `docs/BANDERA_PR_GUIA.md`, `docs/img/bandera_pr_referencia.svg` | Siempre fiel |
| Música | `assets/audio/musica/` (5 temas de Kelvin hechos con Suno en plan pagado: exploración, carrera, criadero, tormenta y arena) | Banda sonora del tráiler (uso comercial según el plan de Suno; ver DECISION_LOG 26-oct) |
| Efectos | `assets/audio/` (despegar, aterrizar, eclosión, nido) | Sonido del tráiler |
| Herramientas de captura | `tools/build/look_capturas.py`, `web_capturas.py`, `tools/blender/mapa_render.py` | Capturas y renders repetibles |

**Falta:** el logo oficial en vectorial (solo hay texto en la web): Kelvin lo aporta o se encarga. Los 14 asentamientos terminados (en curso).

## 3. Biblia visual (preliminar; Kelvin la aprueba)

**Personajes**
- **Vittata:** la cotorra puertorriqueña (*Amazona vittata*), cuerpo verde, frente roja, anillo blanco alrededor del ojo, plumas azules en las alas al abrirlas, pico claro. Proporciones y cara del modelo oficial, **sin variaciones**. Personalidad: inventora, valiente, impaciente, con humor; quiere hacerlo todo sola y aprende a pedir ayuda. Se mueve rápido y con decisión; vuela con aletazos cortos y planeos.
- **Las especies:** solo con su render oficial (`assets/presets`, pieles). Una especie sin render oficial **no aparece** como personaje.
- **Nada de** personajes inventados presentados como oficiales, humanos, villanos con cara, armas ni violencia.

**Mundo (`vibrant_toon`)**
- Paleta del look único: cielo atmosférico azul intenso (cenit `#1e78e8`), verdes saturados y cálidos, agua turquesa, piedra crema mate, tejados **rojo teja cálido y mate**, madera parda. Saturación alta pero no neón.
- Luz de sol cálida, sombras suaves de color, niebla de profundidad azulada a lo lejos.
- Selva densa en dosel continuo; el tepuy con pared de roca gris y la **Ciudad de los 36** encima: piedra crema, cúpulas, cornisas y almenas (meta: `ciudad_tepuy_meta_kelvin.jpg`).
- Bohíos ×1,75 con tejado rojo; ríos turquesa con meandros; ruinas de piedra antigua con musgo.
- Clima: día soleado por defecto; tormenta con nubes oscuras, lluvia y relámpago para el misterio; atardecer para el coro del coquí.

**Cinematografía**
- Planos: gran plano aéreo de revelación, seguimiento de vuelo detrás o al lado de Vittata, primer plano de reacción, plano detalle (el transmisor, el símbolo de 36), contrapicado de la ciudad.
- Cámara: drones suaves, travellings que revelan; nada de cámara en mano temblorosa.
- Ritmo: empieza en calma (asombro), acelera (aventura), se corta en seco (misterio), sube al final. Cortes al compás de la música.
- Transiciones: barrido con nube o ala, fundido a blanco con el relámpago, corte duro con el sonido del transmisor.
- Composición: Vittata en tercios, mirando hacia donde va; la ciudad siempre más grande que ella.

**Sonido**
- Música: los 5 temas de Kelvin (exploración para el mundo, carrera para el juego, tormenta para el misterio).
- Ambiente: selva, coquí al atardecer, río, lluvia, trueno, viento en el vuelo; aletazos al despegar y al aterrizar.
- Voces: la voz del transmisor (filtrada, sin cara); el resto, sin diálogo o con una frase.
- Todo con derechos claros: nada de música ni sonidos de terceros sin licencia.

## 4. Storyboard del tráiler «El gran encuentro» (45–60 s)

Cada plano dice de dónde sale. **Gameplay** = captura real del juego. **Blender** = render del modelo oficial. **IA** = generado con Grok Imagine (solo donde no pone en riesgo a Vittata). Lo que no sea gameplay lleva el aviso «escena cinemática» en el pie del video.

| # | Escena | Duración | Fuente | Contenido |
|---|---|---|---|---|
| 1 | El mundo despierta | 0–8 s | Gameplay + IA (nubes, luz) | Vuelo de cámara sobre la selva y el río; se revela el tepuy y la Ciudad de los 36 (vista `ciudad_tepuy`) |
| 2 | Vittata | 8–14 s | Blender (o gameplay) | Vittata abre las alas en una rama y despega |
| 3 | El misterio | 14–22 s | Gameplay + IA (tormenta) | La tormenta, el transmisor que chispea, la voz: «Si alguien puede escucharme…», el símbolo de 36 |
| 4 | Los personajes | 22–28 s | Renders oficiales | 3–4 especies con render oficial, una tras otra, con su nombre |
| 5 | El juego real | 28–42 s | **Gameplay** | Vuelo, River Rush, Flight, Maze, el criadero y el ropero: cortes de 2 s |
| 6 | El gran encuentro | 42–52 s | Gameplay + IA (luz) | La Ciudad de los 36 al atardecer; asientos vacíos; Vittata mira desde el borde del tepuy |
| 7 | Cierre | 52–58 s | Diseño | Logo · VUELA. EXPLORA. DESCUBRE TU AVENTURA. · JUGAR GRATIS · amazonaverse.com |

Formatos: se edita una vez en 16:9 y se reencuadra a 9:16 y 4:5 con Vittata y la ciudad en zona segura; solo se generan aparte los planos que no se puedan reencuadrar.

## 5. Plantilla de prompt (14 campos)

```
AMAZONA VERSE — <NOMBRE DE ESCENA> · v<n>
1 Objetivo: <qué debe sentir quien lo ve>
2 Referencias oficiales: <rutas exactas de docs/img/ o assets/, adjuntas>
3 Personajes: <ninguno | especie con render oficial | Vittata SOLO por imagen de referencia, para la prueba A>
4 Entorno: <zona del mapa y vista de mapa_vistas.json>
5 Acción: <qué pasa, en una frase>
6 Cámara: <tipo de plano y movimiento>
7 Luz: <hora, clima>
8 Estilo: vibrant_toon stylized 3D game look, saturated warm greens, turquoise water, cream stone, warm matte red roofs; not photorealistic
9 Duración: <s>   10 Formato: <16:9 | 9:16 | 4:5>   11 Resolución: <la máxima del modo, anotada>
12 Sonido: <sin audio | ambiente: …>
13 Restricciones: no redesign of characters, no extra limbs, no text, logos or watermarks, no flags unless the official reference is supplied, no invented characters, no weapons or violence
14 Aceptación: <lista de criterios de la prueba>
```

Prompts listos para las pruebas (en inglés, que es como mejor responde el modelo; se completan con las imágenes reales al usarlos):
- **A · Vittata en vuelo (imagen → video):** «Animate the supplied official image of Vittata, a Puerto Rican Amazon parrot game character. She spreads her wings and takes off from the branch, flying out of frame to the right. Keep her exact design: green body, red forehead, white eye ring, blue wing feathers, same proportions and face as the reference. Stylized 3D game look, warm sunlight, jungle background softly out of focus. 6 seconds, 16:9, no text.»
- **B · Ciudad de los 36 (imagen → video):** «Animate the supplied official game screenshot. Slow cinematic drone push-in towards the cream stone city with domes on top of the tepui, clouds drifting, sunlight moving across the jungle canopy. Keep architecture, colors and layout exactly as in the image; no new buildings. 8 seconds, 16:9, no text.» (espera a la ciudad aprobada)
- **C · Aventura y misterio:** «Animate the supplied official game screenshot of the jungle river at dusk. A storm rolls in: dark clouds, lightning, rain starting, wind in the trees, a faint pulsing light in the fog beyond the river. No characters. 8 seconds, 16:9, ambient storm sound.»

## 6. Las tres pruebas (y la prueba 0)

| Prueba | Qué mide | Cuándo | Cómo se aprueba |
|---|---|---|---|
| **0 · Capacidad** | Plan real, resolución máxima, duración, límite diario, audio, imagen → video, con 2 generaciones de un paisaje sin personajes | Ya (no toca el mapa) | Tabla del §1 completada con lo medido |
| **A · Vittata en vuelo** | Si la IA respeta a Vittata en movimiento | Ya | Kelvin: «es Vittata» en los fotogramas 1, medio y último, sin deformaciones; si no pasa, **Vittata no se genera con IA** (va siempre por Blender o gameplay) |
| **B · Ciudad de los 36** | Si respeta la arquitectura y la escala del mapa | Con la ciudad aprobada | Misma ciudad que la captura, sin edificios nuevos, tejados y color correctos |
| **C · Aventura y misterio** | Ambiente, emoción y continuidad sin personajes | Ya, con una captura actual del río | Se entiende, se siente misterio y casa con el estilo |

Cada prueba se registra en el §9: prompt, referencias, modelo, duración, resolución, número de generaciones, créditos o costo, resultado, problemas, correcciones y aprobación.

## 7. Presupuesto comparativo (estimado: **nada está medido todavía**)

Supuestos: el tráiler son ~55 s; ~60 % gameplay y Blender (sin costo de generación) y ~40 % IA (≈ 6–8 planos de 4–8 s). Aprovechamiento supuesto de la IA: 1 clip bueno de cada 4–6 generaciones (se mide en las pruebas).

| | A · Suscripción actual | B · + API con tope | C · Híbrido con especialista |
|---|---|---|---|
| Costo directo | $0 extra | ~$15–45 (30–40 clips de 8 s a 720p; ~$60–80 a 1080p) | A o B + $300–800 de un editor (montaje, color y mezcla) |
| Tiempo | 3–5 días (límite diario de clips) | 1–2 días | 1–2 semanas (agenda del editor) |
| Revisión de Kelvin | 3–4 h | 2–3 h | 2 h |
| Coordinación (Claude + agentes) | 4–6 h | 4–6 h | 3–4 h |
| Calidad esperada | Buena para redes; 1080p sin confirmar | La mejor resolución posible de la IA | La más pulida |
| Riesgos | Límite diario; 720p; generación manual | Gasto que sube con las repeticiones; 1.5 en *preview* | Costo y dependencia |
| Costo por clip aprobado | ~$0 + tiempo | ~$2–10 | El del editor |

**Recomendación:** empezar por **A**. Si la prueba 0 muestra que la suscripción no llega a 1080p o el límite frena, pasar a **B con un tope** que fije Kelvin (sugerido: $25). **C** solo si el montaje casero no llega a la calidad que Kelvin quiere. Esto **reemplaza** la línea de $3.000–8.000 del tráiler en `GAME_FIRST.md` §7.

## 8. Quién hace qué y cuándo

**Carril recomendado: C + A de la directiva.** No se abre un agente nuevo ahora. Lo preparatorio va al **carril L** (auditor visual), que ya hace capturas del mapa y es el que menos pisa la ruta crítica, cuando tenga hueco. La generación en grok.com **la hacen Kelvin o Fujimoto a mano** (Cursor no puede usar la suscripción). Cuando Kelvin apruebe el mapa, se abre un agente **AV** dedicado a montar el tráiler.

| # | Entregable (directiva §18) | Responsable | Prioridad | Depende de | Aceptación | Estado |
|---|---|---|---|---|---|---|
| 1–3 | Capacidades, 1080p, suscripción frente a API | Coordinadora (hecho) + Kelvin (confirma el plan) | Alta | Cuenta de Kelvin | §1 con lo medido en la prueba 0 | Investigado; falta medir |
| 4 | Inventario de referencias | Coordinadora | Alta | — | §2 | **Hecho** (falta el logo vectorial) |
| 5–6 | Carril AV y este documento | Coordinadora | Alta | — | Este archivo y fila en el tablero | **Hecho** |
| 7 | Biblia visual preliminar | Coordinadora → Kelvin aprueba | Alta | — | §3 aprobado | Propuesta |
| 8 | Storyboard | Coordinadora → Kelvin aprueba | Media | — | §4 aprobado | Propuesta |
| 9 | Prompts reutilizables | Coordinadora | Media | — | §5 | **Hecho** (v1) |
| 10 | Plan de pruebas | Coordinadora; ejecutan Kelvin o Fujimoto en grok.com | Media | Prueba B: ciudad aprobada | §6 | Plan listo |
| — | Paquetes de producción A (Vittata en vuelo), B (ciudad desde la meta de Kelvin), C (tormenta y señal) y D (guardianes) | Coordinadora | Alta | — | `docs/equipo/av/paquetes.json` y sus `.zip` | **Hecho** |
| G30 | Captura de gameplay de cine (cuadro a cuadro determinista, 1080p60, sin interfaz, desde las vistas de `mapa_vistas.json` y recorridos de vuelo) | Carril I | Media | — (la herramienta no depende del mapa; las tomas definitivas, sí) | Un clip de prueba de 10 s de Villa Raíz en 1080p60 sin tirones | Libre |
| G31 | Montaje por código con `ffmpeg` desde una lista de planos JSON, con versiones 16:9, 9:16 y 4:5 | Carril I o el que quede libre | Media | G30 para probar | Un montaje de prueba de 20 s con 3 planos, música de Kelvin y títulos | Libre |
| G32 | Render del modelo oficial de Vittata con `bpy` (Cycles por CPU) en la nube: despegue de 5 s con su rig | Carril M al terminar G27 | Media | — | Render fiel, 1080p, fondo transparente | Libre |
| — | Banco de capturas de referencia (cada vista de `mapa_vistas.json` en 16:9 y 9:16, y Vittata en el creador) | Carril L | Media | Mapa en curso (se repite al aprobarse) | `docs/img/av_ref_<vista>_<fecha>.jpg` | Pendiente |
| — | Clips de gameplay para el tráiler (vuelo, River Rush, Flight, Maze, criadero, ropero) | Agente AV | Media | **Mapa aprobado** | 1080p, 60 fps si se puede, sin interfaz | Fase 1 |
| — | Renders de Vittata en Blender (despegue, mirada) | API en la Mac (Blender) | Media | Mapa aprobado | Fiel al rig oficial | Fase 1 |
| 11 | Presupuesto comparativo | Coordinadora | Alta | Prueba 0 | §7 con números medidos | Estimado |
| 12 | Cronograma | Coordinadora | Alta | — | §10 | **Hecho** |
| 13 | Riesgos | Coordinadora | Alta | — | §11 | **Hecho** |
| 14 | Recomendación final | Coordinadora | Alta | Pruebas 0, A y C | §7 y §12 | Preliminar |

## 9. Registro de pruebas

| Fecha | Prueba | Prompt (versión) | Referencias | Modelo y modo | Duración | Resolución | Generaciones | Créditos o costo | Resultado | Problemas | Aprobación |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 28-oct | A · Vittata en vuelo | paquete A v1 | las 5 del paquete | Grok Imagine (plan Ultra), imagen → video | 15 s | **1280×720, 24 fps** (no 1080p), con audio | 1 | suscripción ($0) | **Pasa**: Vittata fiel en el primer fotograma (verde, frente roja, ojos blancos y azules, pico amarillo); en vuelo desde atrás se mantiene el diseño; vuelo fluido; estilo 3D toon | De espaldas la cabeza es una esfera verde lisa; ninguna deformación | Pendiente de Kelvin |
| 28-oct | B · Ciudad de los 36 (meta) | paquete B v1 | las 3 del paquete | Grok Imagine | 15 s | 1280×720, 24 fps | 1 | $0 | **Pasa**: torres crema con cúpulas sobre el tepuy, selva alrededor, el conjunto de la izquierda sobre la roca, nubes; se siente legendaria | Más torres y más altas que la meta; sirve como visión | Pendiente de Kelvin |
| 28-oct | C · Tormenta y señal | paquete C v1 | las 3 del paquete | Grok Imagine | 15 s | 1280×720, 24 fps | 1 | $0 | **Pasa**: Vittata fiel en el mirador, tormenta azul, la luz en la niebla, misterio sin miedo | — | Pendiente de Kelvin |
| 28-oct | D · Guardianes | paquete D v1 | las 5 del paquete | Grok Imagine | 15 s | 1280×720, 24 fps | 1 | $0 | **No pasa**: las otras cotorras no son los renders oficiales de especie (diseños inventados: cabeza amarilla, cabeza turquesa); solo Vittata es fiel | Kelvin la acepta (28-oct) como «cotorras del mundo», sin nombre ni especie; si alguna pasa a personaje con nombre, él fija su diseño | **Aceptada por Kelvin** (DECISION_LOG 28-oct) |
| 28-oct | Teaser v1 (montaje) | `tools/av` con ffmpeg | A, B, C + tema «exploración» de Kelvin | — | 40 s | 1920×1080 máster; entregas 1280×720 (14 MB) y 720×1280 (10 MB) | — | $0 | v2 (51 s): B → A → C → D → cartel final; v1 (40 s) sin D. Orden v1: B → A → C → cartel final («AMAZONA VERSE · VUELA. EXPLORA. DESCUBRE TU AVENTURA. · JUGAR GRATIS · amazonaverse.com»); fundidos de 0,7 s; ambiente al 50 % + música | Sin gameplay todavía (espera BM1/G30); el cartel es tipográfico (sin logo vectorial); Kelvin prefiere 720p para la web | Pendiente de Kelvin |

## 10. Cronograma (compatible con el mapa)

- **Fase 0, ya (28–30 oct):** este documento; prueba 0, A y C en grok.com (Kelvin o Fujimoto: 1–2 h); el carril L arma el banco de capturas cuando tenga hueco.
- **Fase 1, con el mapa aprobado (~30 oct–2 nov):** capturas definitivas; prueba B; clips de gameplay; renders de Vittata.
- **Fase 2, tráiler (~3–7 nov):** generación de los planos de IA aprobados, montaje, música de Kelvin, versiones 16:9, 9:16 y 4:5. Kelvin aprueba el corte final.
- **Fase 3, web GAME-FIRST (~7–10 nov):** portada con el tráiler (según `GAME_FIRST.md` §6), cargado aparte y sin tocar la descarga del juego.
- **Fase 4, contenido continuo:** teasers, personajes, novedades y récords (§12).

## 11. Riesgos

- **Fidelidad de Vittata:** la IA tiende a «parecido, no igual». Mitigación: prueba A; si falla, Vittata solo por Blender o gameplay.
- **Engaño al jugador:** cinemáticas que parezcan gameplay. Mitigación: etiqueta «escena cinemática» y nunca mostrar mecánicas que no existen.
- **Derechos:** el copyright de lo generado por IA no está claro; xAI recibe una licencia amplia sobre lo que se sube y se genera. Mitigación: el corazón del tráiler es gameplay y Blender (autoría humana); la IA solo hace fondos y transiciones; Kelvin revisa los términos (y, si quiere, con su abogado).
- **Datos que subimos:** las referencias que se suben a grok.com pueden usarse para entrenar. Mitigación: activar la opción de no compartir en los ajustes; no subir arte sin publicar que se quiera proteger.
- **Bandera de Puerto Rico:** la IA la deforma a menudo. Mitigación: no generarla; ponerla en edición con el SVG oficial.
- **Costos:** la API cobra cada intento. Mitigación: solo con tope aprobado por Kelvin y registro en §9.
- **Rendimiento web:** un video pesado en la portada frena la carga. Mitigación: póster ligero + video que carga después, sin tocar el juego.

## 12. Biblioteca de contenido para redes (después del tráiler)

Cada pieza con un objetivo: **curiosidad**, **mostrar diversión** o **invitar a jugar**.
- **Descubrimiento:** un lugar del mapa por semana («¿Sabías que en lo alto del tepuy…?»): curiosidad.
- **Aventura:** clips de 10–15 s de vuelo, tormenta o persecución: diversión.
- **Personajes:** una especie de los 36 con su render y un dato real: curiosidad.
- **Personalización:** trajes de Puerto Rico del ropero: invitar a jugar.
- **Minijuegos:** récord de la semana y reto a batirlo: invitar a jugar.
- **Historia:** pistas del misterio de las voces, sin destripar: curiosidad.
- **Creatividad:** cómics de jugadores (con permiso de un adulto): comunidad.

## 13. Reservado para Kelvin

Canon y personajes; biblia visual y storyboard; cualquier gasto (créditos de la API, servicios externos, compras); los términos de uso y licencias; los materiales promocionales definitivos y su publicación; la portada nueva de la web; el logo.

## 14. Automatización y herramientas (investigado el 28-oct)

**Lo que no se puede automatizar sin gastar:** la generación en Grok Imagine **con la suscripción** se hace en grok.com o en la app; no hay una vía oficial para que Cursor la dispare. Automatizar el navegador de grok.com iría contra el uso permitido del servicio: **no se hace**. La vía oficial para automatizar es la **API de xAI**, que se cobra aparte por segundo y no viene incluida en la suscripción (una fuente habla de un fondo de uso semanal compartido entre los productos de Grok, sin confirmar que cubra la API). Por eso **alguien tiene que pulsar «generar»** con cada paquete: es la única tarea manual que queda (ver la decisión K1 en §15).

**Lo que sí se automatiza sin costo:**
- **Gameplay de cine, sin GPU:** captura **cuadro a cuadro determinista** del juego (se controla el reloj del bucle de render y se guarda cada cuadro), a 1080p y 60 fps, aunque la nube no tenga GPU: tarda más, pero sale perfecto. Es el mismo principio de herramientas como timecut/timesnap o puppeteer-capture con Chrome sin pantalla. Tarea **G30**.
- **Montaje por código:** `ffmpeg` (ya instalado en la nube) monta el tráiler desde una lista de planos en JSON (clip, entrada, salida, transición, música, títulos), saca las versiones 16:9, 9:16 y 4:5 con reencuadre por zona segura y comprueba duración y medidas. Tarea **G31**.
- **Renders de Vittata con su modelo oficial:** Blender en la Mac (API, BM) o Blender como módulo de Python (`bpy`) con Cycles por CPU en la nube, sin GPU: lento pero gratis. Tarea **G32** (investigar y probar un render de 5 s del despegue).
- **Paquetes de producción:** `tools/av/armar_paquetes.py`.
- **Registro:** cada generación se anota en §9 (prompt, referencias, ajustes, resultado).

**Herramientas descartadas por ahora:** editores de pago o en la nube con marca de agua; plantillas de video con licencia comercial dudosa; música o efectos de bancos sin licencia clara.

## 15. Decisiones que solo puede tomar Kelvin
- **K1 · Quién pulsa «generar» en Grok Imagine.** (a) Fujimoto o alguien del equipo con acceso a la cuenta de Kelvin, siguiendo los paquetes (recomendado: cero gasto, Kelvin solo aprueba); (b) Kelvin, en tandas (unos 2 minutos por paquete); (c) la API de xAI con un tope que fije Kelvin (automatizado, pero es un gasto nuevo).
- **K2 · Aprobar la biblia visual (§3) y el storyboard (§4).**
- **K3 · Aprobar o rechazar cada resultado** de las pruebas A, B, C y D con sus criterios.
- **K4 · Los términos de uso de xAI** (licencia sobre lo que se genera y opción de no usar los datos para entrenar), con su abogado si quiere.
