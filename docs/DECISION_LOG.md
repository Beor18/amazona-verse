# DECISION_LOG

## 2026-10-24 · Motor del hito 1: web 3D con Three.js (reversible)
- **Por qué:** corre ya en iPhone, Android, Windows, macOS y navegadores sin builds ni firmas. Se puede probar aquí y compartir como link.
- **Descartado por ahora:** Godot 4 (requiere descargar el editor y plantillas de exportación; iOS necesita Xcode completo y cuenta de Apple) y Unity (licencia y un editor pesado).
- **Camino futuro:** mantener datos y lógica separados del render para portar a Godot o empaquetar la web (Capacitor) para tiendas cuando haya modelos 3D convertidos.
- Three.js r128 desde cdnjs (UMD) para que funcione también dentro del visor de Claude.

## 2026-10-24 · Vittata como sprite 2.5D (temporal)
El modelo `Piloto Cotorra.blend` (Blender 2.80) aún no está convertido: Blender no estaba instalado. Se usa el render oficial con transparencia como sustituto declarado.

## 2026-10-24 · Cámara en tercera persona libre (PROPUESTO)
Decisión abierta en el documento maestro. Se eligió tercera persona para el prototipo porque es la más fácil de cambiar después.

## 2026-10-24 · Prototipo web como referencia jugable, no como reemplazo
- La lógica del capítulo está separada del render y los datos (eventos, guardado, cómic) son JSON versionado, para portarlos a Godot o Unity sin rehacer el diseño.
- **Condición para cambiar de motor:** tener modelos con rig y animaciones (ahora no existen) o necesitar builds nativas de tienda.

## 2026-10-24 · Eventos con esquema propio y migración de partidas (v2 → v3)
Se adopta el esquema del directivo V4 §7.3. Las partidas v2 se migran; las ilegibles se copian antes de descartarlas.

## 2026-10-24 · PDF sin librerías
Se genera un PDF de una página con el JPEG del cómic, en vez de cargar jsPDF, para que funcione dentro del visor de Claude (que bloquea fetch externos). Reversible si se necesita texto seleccionable.

## 2026-10-24 · El aprendiz del jugador acompaña a Vittata
El jugador controla a Vittata en la historia y su personaje creado la sigue y aparece en el cómic. Revisar en pruebas con niños (V4 §3.2).

## 2026-10-24 · Modelo Blender convertido a GLB, pero no se usa todavía
`vittata_base_lod1.glb` (20k triángulos) existe, pero el .blend no trae texturas (rutas a un disco E:\ de Windows) ni el esqueleto RigCotorra, y muestra un traje negro de piloto. Se sigue usando el render 2D hasta que Kelvin confirme el diseño y aparezcan las texturas y el rig.

## 2026-10-24 · Vittata es la cotorra verde (decisión de Kelvin)
La protagonista se representa con los renders verdes oficiales. Los uniformes se crearán después. El modelo con traje de piloto se reserva para un minijuego aparte; no se usa en la historia principal.

## 2026-10-24 · Duración de "La ruta de la gota"
- Contexto: la misión educativa que reemplaza los anillos dura 5 min (2 más que los anillos); el capítulo quedó fijado en 12 min.
- Decisión (equipo, delegada por Kelvin): se recorta 1 min de recolección y la construcción queda intacta. Recolectar es lo menos educativo; construir con la evidencia cierra el aprendizaje.
- Además: las fichas del Diario sin fuente verificada no se publican.

## 2026-10-24 · Kit de flora de El Yunque (artista de entorno)
- Escala: el mundo está a escala de la cotorra (1.4 m). Los árboles miden ≈1/3 de su altura real (ceiba 14.5 m, tabonuco 11.5 m) y las plantas ≈1:1, para que los árboles quepan en cámara y las plantas se lean junto a la cotorra.
- Acordado con el programador gráfico: texturas de hoja ≤512 px con borde de alfa nítido y ≤2 primitivas por especie, por los móviles y Chromebooks (mipmaps con alphaTest). El motor genera los impostores lejanos, así que el kit no trae LOD.
- COLOR_0 lleva AO, viento y fase, no color. El motor apaga `vertexColors` y lo lee en el shader.
- Los datos educativos del kit se alinean con las fichas del Diario (`lecciones.js`). No se usa "la cotorra come frutos de palma de sierra" mientras siga por verificar.

## 2026-10-24 · Mapa del Cap. 1 "El Yunque" (level designer)
- 2026-10-24 · El relieve base es el terreno original de Kelvin (`AV3DMaxTerrainExport.max`, a 0,255 m/u), con su río serpenteante y sus mesetas. Encima van isla, montaña en terrazas, quebrada de La Mina, costa y senderos · level designer · usar los assets del fundador y guiar con el relieve, sin paredes invisibles.
- 2026-10-24 · Cada punto del layout usa un edificio del kit de Kelvin (`edificiosKelvin`, 31 piezas, con aldea taína y ruinas). Las estructuras propias quedan de respaldo; el puente colgante de 25 m es propio porque el kit no tiene equivalente · level designer + coordinador · pedido de Kelvin.
- 2026-10-24 · El mapa no lleva anillos: `RINGS` se sustituye por `misiones.perchas` y `misiones.rutaGota` (La ruta de la gota) · level designer · regla del fundador y EDUCATIVO.md.
- 2026-10-24 · Las piezas "Ancient Temples" se presentan como Ruinas del Pacto (ficción del canon), no como arquitectura taína. La aldea taína usa bohíos, caney, batey con piedras y canoas · level designer · rigor cultural en un juego escolar.
- 2026-10-24 · Las especies de flora conservan sus ids y se traducen al kit con `flora.modelos`. Se pidieron las variantes arbol_enano, palma_sierra_joven y yagrumo_joven · level designer + programador gráfico + artista de entorno · no romper el código del motor.
- 2026-10-24 · Los senderos tienen una pendiente máxima de diseño del 30 % (corte y relleno) y las rampas de la cumbre, la colina, los Picachos y las ruinas llegan al 32 %. En la malla final no queda ningún tramo por encima del 50 % · level designer + programador gráfico · pedido del coordinador.
- 2026-10-24 · Variantes entregadas: `arbol_enano` (bosque enano de la cumbre, 3.4 m), `palma_sierra_joven` (4.6 m) y `yagrumo_joven` (3.7 m) · artista de entorno · los jóvenes comparten materiales con el adulto para no sumar texturas.

## 2026-10-24 · Ropa: color, nitidez, pañuelo, párpados y piezas nuevas (TA de personaje)
- 2026-10-24 · Todo color hecho a mano del personaje y la ropa pasa a lineal con un único helper, `AVColor` (wardrobe.js). Las CanvasTexture van en sRGB con mipmaps y la anisotropía máxima. Los .glb viejos con gamma 2,2 se corrigen al cargar; los nuevos llevan `av_srgb` · TA · el naranja #f2a03d salía crema (#edd9a6). Medido: creador y juego dan el tono elegido en la parte iluminada.
- 2026-10-24 · MSAA siempre, en el juego y en el creador. DPR: hasta 2 en el creador y hasta 1,5/2 (táctil/escritorio) en el juego, con resolución dinámica (`adaptDPR`, gancho `'dpr'`) · TA · los traits se veían pixelados.
- 2026-10-24 · Estampados de 2048×1024 (1024 en móvil) en una caché LRU. El tejido suave sustituye al ruido de 2 px. La paja es una sarga diagonal proyectada en tres planos · TA.
- 2026-10-24 · Contrato de UV de TELA con el artista de traits: convención cyl_uv; el juego gira 180° y normaliza a 1,2 × 0,6 m. Marcas `av_uv` y `av_flag_h`. El parche plano `BANDERA` va en gorra, tenis y mochila PR · TA + artista de traits · bandera fiel sin estirar ni cortar.
- 2026-10-24 · Bandera PR: 3:2, triángulo equilátero, estrella r = alto/6 en el baricentro y colores #EE0000/#0044FF/#FFFFFF · TA + criadero (dueño de la guía).
- 2026-10-24 · Párpados como casquete que gira sobre la curvatura medida del ojo, del color del anillo de la especie · TA · las "rayitas verdes" flotaban sobre los ojos.
- 2026-10-24 · Ajustes de pose por la ropa: +6 mm con calzado (la suela baja de z=0); dedos fijos dentro del zapato; aletas con piernas abiertas 0,09 rad; alas abiertas 0,12 rad con pantalón; al nadar con equipo de espalda, 0,6 rad del cuello pasan al pecho · TA · pedidos del artista.
- 2026-10-24 · `accessoryTest` precarga los .glb del ropero (`AVCharacter.preloadRopa`). Los lentes deben dejar 1 cm de aire delante del ojo, en vez de 4,5 cm · TA · la prueba pasaba o fallaba según la caché, y con los lentes reales fallaba siempre.
- 2026-10-24 · Video pitch de 2:45.6 (69 compases a 100 BPM), una sola voz boricua y 320 palabras, todo con gameplay en movimiento (docs/pitch/) · Comité de pitch + editor de video + ingeniero de sonido · cabe en la meta de 2:30-2:50 y deja aire a la música.
- 2026-10-24 · Cifras habladas en el pitch: solo USFWS (María 2017, más de 900) y NCES (98,577 escuelas públicas en 2020-21; 29 % de estudiantes hispanos en 2022). Fuera: tracción, escuelas de PR, precio de la licencia y monto del capital · Comité de pitch · regla de no inventar cifras; dinero y montos los decide Kelvin.
- 2026-10-24 · El pitch y la web dicen "pensado para Chromebooks" (no "corre en") y nombran WebAssembly solo como principio, sin "22 KB" · CTO del comité · todavía no hay prueba en Chromebook y meshopt no está integrado.
- 2026-10-24 · Línea del criadero en el pitch y la web: "tu cotorra crece con lo que aprendes: huevo, bebé, juvenil, adulta", sin azar ni compra · comité + game designer de huevos · el cuidado es cariño, no castigo, y el crecimiento premia aprender.
- 2026-10-24 · Lema común del pitch y la web: "Cuando nuestros niños aprenden a cuidar su isla, la cotorra vuelve a volar." · Comité de pitch + web lead · un solo mensaje en todos los canales.
- 2026-10-24 · El corte del pitch se alinea con la VO TTS real (vo_bloques.json): 48 tomas; el montaje de verbos corta en la palabra; nuevas tomas problema_estacion y aprender_pava_premio (la pava se gana jugando) · Comité de pitch + sonido + editor · que la imagen diga lo mismo que la voz en el mismo instante.
- 2026-10-24 · Corte final del pitch acordado por comité, editor y sonido: 48 tomas, 165.6 s. Buceo grabado a ras de la superficie (no hay render subacuático). tec_navegador va en un marco neutro hasta que Kelvin grabe la pantalla real. Sin FPS salvo medida real. La lectura en inglés del juego va en 84.9 como demostración · Comité de pitch + editor + sonido · honestidad técnica y claridad.
- 2026-10-24 · Web del producto aprobada por el comité con un cambio: "El capítulo 1 jugable" en vez de "completo" · Comité de pitch + web lead · es un prototipo; no prometer de más.
- 2026-10-24 · Recolección −1 min: la familia de Luma aporta 3 tablas; bastan 4 recogidas en vez de 7 (~50 m de ruta guiada en vez de ~113 m). No se mueven los recursos de mundo.js y la construcción no cambia · gameplay · aplica la decisión de "La ruta de la gota".
- 2026-10-24 · "La ruta de la gota" es el paso 3 de la historia: el terreno se elige al terminarla, después de "Luma te pregunta". La elección sigue libre y la crecida no cambia · gameplay · primero la evidencia y luego la decisión (EDUCATIVO §2).
- 2026-10-24 · Solo se publica lo verificado: fichas con verificacion = verificado y del grado elegido, con su fuente y sin URL (las URL solo en Modo Maestro). Mientras sigan POR VERIFICAR, q3 y q4 salen de la formativa, la cadena usa "frutos del bosque" y la gota cae en el dosel sin decir que la bromelia guarda agua · gameplay · regla de verificación.
- 2026-10-24 · Pendiente (coordinador/narrativa): las 12 entradas del Diario Boricua no tienen fuente verificada; por la regla anterior habría que ocultarlas o validarlas · gameplay · se dejan como están porque dan la ropa y son de otro rol.
- 2026-10-24 · Modo Maestro: enlace discreto al pie de la pausa y una suma (no es contraseña). Reporte CSV/JSON por la capacidad downloads del artifact y, si no está, se copia al portapapeles. Registro solo en el dispositivo (amazonaverse.aula.cap1), sin nombres ni ids · gameplay · EDUCATIVO §4, COPPA/FERPA.
- 2026-10-24 · Pausa real congelando dt con el hit-stop del bucle (renderer.js es del TA). Cuando se pueda, el bucle debería leer G.pausa · gameplay.
- 2026-10-24 · Los lugares de la misión van por id de POI (G.terreno.poi). Ids nuevos pedidos al gráfico: marcas_agua, percha_*, nube_lluvia, bromelia_dosel, rio_terrenoA, gota_poza, roca_crecida y flamboyan_plaza. Con el mapa nuevo se usan las perchas y la ruta de la gota del level designer · gameplay + gráfico + level designer.
- 2026-10-24 · q7 (nativas e introducidas) solo en 5.º–6.º y solo si se encontró el flamboyán (hallazgo opcional en la plaza) · gameplay · "los hallazgos opcionales abren q7" (lecciones).

## 2026-10-24 · Directiva V6.1 (propuesta por ChatGPT, revisada por el coordinador)
- Se adopta: rama `estable` (solo la mueve el coordinador como Integration Lead tras QA), etiqueta por versión publicada (`v16-publicada` = d978bd0), estados de tarea BACKLOG→READY→EN CURSO→INTEGRACIÓN→PRUEBAS→APROBADO/BLOQUEADO, "nadie aprueba su propia entrega", recorrido E2E de aceptación, TEAM_AUDIT.md y PRODUCTION_DASHBOARD.md, checklist de seguridad infantil.
- No se adopta (por ahora): builds nativas Windows/macOS/Android/iOS (el producto es web), "34 modelos auténticos" (hoy existe un modelo; las especies son variantes de color), bajar prioridad del pitch (Kelvin lo pidió explícitamente).
- Regla nueva: nadie ejecuta `git checkout`/`reset`/`stash` sobre archivos de otro dueño.
- Diario Boricua: las 12 entradas sin fuente se ocultan hasta verificarlas (misma regla que el Diario de ciencia).
- Compañero 3D: la segunda cotorra que sigue a Vittata es la cotorra creada por el jugador; se ve casi igual a Vittata y confunde. Se encarga a diseño (huevos) + gameplay que el compañero sea la cotorrita nacida del criadero (bebé→juvenil→adulto) y se distinga claramente.
