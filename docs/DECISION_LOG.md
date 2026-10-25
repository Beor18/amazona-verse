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

## 2026-10-24 · Mapa del Cap. 1 "El Yunque" (level designer)
- 2026-10-24 · El relieve base es el terreno original de Kelvin (`AV3DMaxTerrainExport.max`, a 0,255 m/u), con su río serpenteante y sus mesetas. Encima van isla, montaña en terrazas, quebrada de La Mina, costa y senderos · level designer · usar los assets del fundador y guiar con el relieve, sin paredes invisibles.
- 2026-10-24 · Cada punto del layout usa un edificio del kit de Kelvin (`edificiosKelvin`, 31 piezas, con aldea taína y ruinas). Las estructuras propias quedan de respaldo; el puente colgante de 25 m es propio porque el kit no tiene equivalente · level designer + coordinador · pedido de Kelvin.
- 2026-10-24 · El mapa no lleva anillos: `RINGS` se sustituye por `misiones.perchas` y `misiones.rutaGota` (La ruta de la gota) · level designer · regla del fundador y EDUCATIVO.md.
- 2026-10-24 · Las piezas "Ancient Temples" se presentan como Ruinas del Pacto (ficción del canon), no como arquitectura taína. La aldea taína usa bohíos, caney, batey con piedras y canoas · level designer · rigor cultural en un juego escolar.
- 2026-10-24 · Las especies de flora conservan sus ids y se traducen al kit con `flora.modelos`. Se pidieron las variantes arbol_enano, palma_sierra_joven y yagrumo_joven · level designer + programador gráfico + artista de entorno · no romper el código del motor.

## 2026-10-24 · Ropa: color, nitidez, pañuelo, párpados y piezas nuevas (TA de personaje)
- 2026-10-24 · Todo color hecho a mano del personaje y la ropa pasa a lineal con un único helper, `AVColor` (wardrobe.js). Las CanvasTexture van en sRGB con mipmaps y la anisotropía máxima. Los .glb viejos con gamma 2,2 se corrigen al cargar; los nuevos llevan `av_srgb` · TA · el naranja #f2a03d salía crema (#edd9a6). Medido: creador y juego dan el tono elegido en la parte iluminada.
- 2026-10-24 · MSAA siempre, en el juego y en el creador. DPR: hasta 2 en el creador y hasta 1,5/2 (táctil/escritorio) en el juego, con resolución dinámica (`adaptDPR`, gancho `'dpr'`) · TA · los traits se veían pixelados.
- 2026-10-24 · Estampados de 2048×1024 (1024 en móvil) en una caché LRU. El tejido suave sustituye al ruido de 2 px. La paja es una sarga diagonal proyectada en tres planos · TA.
- 2026-10-24 · Contrato de UV de TELA con el artista de traits: convención cyl_uv; el juego gira 180° y normaliza a 1,2 × 0,6 m. Marcas `av_uv` y `av_flag_h`. El parche plano `BANDERA` va en gorra, tenis y mochila PR · TA + artista de traits · bandera fiel sin estirar ni cortar.
- 2026-10-24 · Bandera PR: 3:2, triángulo equilátero, estrella r = alto/6 en el baricentro y colores #EE0000/#0044FF/#FFFFFF · TA + criadero (dueño de la guía).
- 2026-10-24 · Párpados como casquete que gira sobre la curvatura medida del ojo, del color del anillo de la especie · TA · las "rayitas verdes" flotaban sobre los ojos.
- 2026-10-24 · Ajustes de pose por la ropa: +6 mm con calzado (la suela baja de z=0); dedos fijos dentro del zapato; aletas con piernas abiertas 0,09 rad; alas abiertas 0,12 rad con pantalón; al nadar con equipo de espalda, 0,6 rad del cuello pasan al pecho · TA · pedidos del artista.
- 2026-10-24 · `accessoryTest` precarga los .glb del ropero (`AVCharacter.preloadRopa`). Los lentes deben dejar 1 cm de aire delante del ojo, en vez de 4,5 cm · TA · la prueba pasaba o fallaba según la caché, y con los lentes reales fallaba siempre.
