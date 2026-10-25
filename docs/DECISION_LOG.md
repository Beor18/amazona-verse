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
- Actualización (Kelvin): ignorar la directiva V6.1 hasta terminar todo lo que está en curso. Queda en pausa; se mantienen solo la regla de no tocar archivos ajenos con checkout/reset/stash, el Diario Boricua oculto hasta verificar y el compañero = cotorrita del criadero.

## 2026-10-24 · Criadero de cotorras y bandera (game designer de huevos)
- 2026-10-24 · Criadero: la cotorrita crece con XP de aprender y explorar (fichas, preguntas, pasos, hallazgos, misiones; cada tipo:id una vez). Cuidar da 5 XP y gasta cargas que se recargan aprendiendo (máx. 4). Nada baja con el tiempo, nada enferma ni muere, sin rachas · huevos · escuela sin ansiedad (EDUCATIVO, MODELO_NEGOCIO).
- 2026-10-24 · Cápsulas temáticas = fantasía; dentro siempre hay un huevo BLANCO como el de Amazona vittata. Rareza = dificultad del reto (inicial → legendario), nunca azar ni precio; las cápsulas no se venden · huevos · exactitud y sin loot boxes.
- 2026-10-24 · Bebé y juvenil = el MISMO modelo de Vittata con escala por hueso y plumón en tiempo de ejecución (API pública de AVCharacter, patrón deshacer/reaplicar como rot()); el adulto es Vittata intacta · huevos + TA · "no cambies nuestra cotorra".
- 2026-10-24 · Bandera PR: 2:3, triángulo equilátero, estrella con radio H/6 en el baricentro y radio interior 0,382; colores #EE0000 / #FFFFFF / #0044FF (azul medio de facto desde 1995, neutral). Las piezas con bandera nunca se venden hasta que el abogado revise el Reglamento 5282 · huevos + TA + traits · Ley 1-1952 y riesgo legal (docs/BANDERA_PR_GUIA.md).
- 2026-10-24 · Modo Maestro del criadero = pestaña en aula.js (G.aula.pestana), misma puerta de suma; XP por el evento 'aprendizaje' que emiten aula, diario y misiones · huevos + gameplay · sin puerta duplicada.
- 2026-10-24 · Compañero = cría del criadero: criadero.js da companero(), vestir(ch) y el evento 'companero'; actores.js hace seguimiento y animación (el bebé salta y aletea, no vuela; el adulto vuela con Vittata). Sin eclosión no hay compañero · huevos + movimiento · decisión del coordinador.
- 2026-10-24 · Pendiente de verificar con DRNA/USFWS antes de publicarlo como ficha: huevo blanco, 2–4 huevos, 24–28 días de incubación, aclimatación y radiotransmisores · huevos · regla de verificación.

## 2026-10-24 · Mundo de El Yunque en el juego (programador gráfico)
- 2026-10-24 · El juego usa el mapa del level designer (AV_MAPA_CAP1): suelo = sus trozos .glb con shader de splat propio; altura = consulta exacta por triángulo de esa misma malla (heightmap solo mientras carga) · gráfico + level designer · los pies no flotan y no hay que mantener dos relieves.
- 2026-10-24 · Escala: el protagonista mide 1,75 m en el juego (jugador.altura de pack.js; el modelo nativo mide 1,4 m y la acompañante 1,4). Casas de Kelvin a ×0,95 (puertas ~1,95 m), templos, ruinas, muelle y canoa a ×1, refugio del jugador = bohío ×0,7; flora del kit a ×1 (ya viene a escala con la cotorra) · gráfico · factor uniforme por modelo, sin deformar.
- 2026-10-24 · Edificios de Kelvin en todos los puntos del layout (estación/refugio, casita, muelle, mirador, ruinas y aldea), orientados al sendero más cercano y con colisión y pisos sacados de su geometría; se queda la estructura propia del level designer solo en el puente colgante de 25 m (el kit no tiene uno) · gráfico + level designer + coordinador · Kelvin pidió usar sus edificios.
- 2026-10-24 · Calidad por presets (bajo/medio/alto) elegidos por GPU y ajustados por FPS después de cargar el mundo; no se guarda entre sesiones (un tirón de carga no deja a nadie en bajo para siempre); ?calidad= lo fija · gráfico + TA (el DPR dinámico sigue siendo del TA).
- 2026-10-24 · Partidas v4 → v5: la posición vuelve a la aparición y el refugio construido pasa a su terreno del mapa nuevo · gráfico + gameplay · las coordenadas del mundo viejo no existen en El Yunque.
- 2026-10-24 · La mezcla v1 del pitch (TTS Paulina, es_MX) es solo guía de tiempos y no se publica; la versión final necesita voz boricua real (Kelvin o un locutor de PR) en pitch/audio/vo_kelvin/ · Comité de pitch + sonido · el pitch exige voz de Puerto Rico y macOS no trae una voz es_PR.

## 2026-10-24 · Ropero: auditoría de proporciones (artista de traits)
- 2026-10-24 · Contrato de UV de TELA: 1 u = 1,2 m y 1 v = 0,6 m, V sin invertir, frente en u=0,5, extras av_uv/av_flag_h; los .glb viejos los normaliza el juego · traits + TA · el mismo estampado sale del mismo tamaño en todas las piezas.
- 2026-10-24 · La bandera en gorra, tenis PR y mochila PR es un parche plano 3:2 con material BANDERA (UV 0–1, textura fiel del TA) y la TELA de esos estilos sale lisa; camisa y pañuelo siguen con el estampado · traits + TA + huevos · guía de bandera: nada envuelto ni a medias.
- 2026-10-24 · Al nadar con la ranura back ocupada, 0,6 rad de la extensión del cuello pasan al pecho (SWIM_BACK_SHIFT) en vez de achicar u ocultar el equipo · traits + TA · la nuca entraba 10 cm en mochila, tanques y jetpack.
- 2026-10-24 · Equipo de espalda a ~80 % del ancho de la espalda y correas con pesos de piel; camisa con mangas que siguen al brazo solo sobre la axila y bajo en arco sobre la cola; pantalón largo hasta el tobillo · traits · proporción con Vittata (docs/equipo/TRAITS_AUDITORIA.md).

## 2026-10-24 · Movimiento y animación de Vittata (rol Movimiento; docs/equipo/MOVIMIENTO.md)
- 2026-10-24 · Volar se detiene con un control claro: V (o el botón, que pasa a decir "Aterrizar") baja suave y frena con las alas; sin tocar nada se queda cernida · Movimiento · antes el vuelo se apagaba solo a los 1,5 s y V dejaba caer en picada a −27 m/s.
- 2026-10-24 · Salto variable (un toque 0,71 m, mantener 1,22 m), búfer de 0,13 s y caída más firme; mismas velocidades de caminar (6,5) y correr (10,5) para no cambiar los tiempos del capítulo · Movimiento · control fino en perchas sin alargar la partida.
- 2026-10-24 · Pendientes: más de 48° no se sube caminando y cuesta abajo se pega al suelo · Movimiento · sin paredes invisibles: el relieve guía y los riscos se vuelan.
- 2026-10-24 · Agarrar: el juego decide qué y cuándo (G.agarre.agarrar), el motor cómo se ve (pico, mano, brazos y patas en vuelo); Acción también suelta · Movimiento + Gameplay · un solo botón para los niños.
- 2026-10-24 · El pico sigue las sílabas del texto que se escribe o de la voz, máx. 9 por segundo · Movimiento · a 45 letras/s el pico vibraba; ahora habla.
- 2026-10-24 · El compañero será la cría del criadero: datos y aspecto de criadero.js (companero, vestir y el evento companero), seguimiento y animación de actores.js; el bebé no vuela · Coordinador + Movimiento + Game designer de huevos.

## 2026-10-24 · Escala del mundo
- Vittata mide 1,75 m en el juego (pack.js); el mundo quedó escalado a 1,75 y así se mantiene (cambiarlo ahora movería mapa, colisiones y ropa sin beneficio). Decisión del coordinador.
- Interiores recorribles de los edificios grandes: P2, después del capítulo 1.

## 2026-10-24 · Voz del pitch
- Kelvin decidió: el pitch v1 sale con la voz sintética de la Mac (no grabará la suya). Queda listo el flujo para cambiarla por una voz boricua si más adelante se consigue una.

## 2026-10-24 · Guardado v5 y cómic (Save & Cómic Engineer)
- 2026-10-24 · La partida (`amazonaverse.save`) lleva un sobre del motor (`formato` 2) sobre la versión del pack (v5). La migración v4 → v5 junta el mapa (pack) con el formato 1 → 2 (motor). El esquema está documentado al inicio de `guardado.js` · Save & Cómic · las migraciones del motor no dependen de los números de versión de cada pack.
- 2026-10-24 · Criadero y aula conservan su clave y su dueño. La partida guarda una copia (`satelites`) y un `resumen` (idioma; huevos, etapa, nivel y XP) que solo se restaura si la clave propia está corrupta, nunca si se borró a propósito. "Nuevo estudiante" borra la partida y todas sus copias · Save & Cómic + criadero · no se pisan archivos ajenos y el siguiente niño no hereda nada.
- 2026-10-24 · Escritura atómica: .tmp verificada → .prev → principal. Sin espacio: sin capturas, luego sin .prev, luego memoria. Si el almacén falla (modo privado o throw), la sesión sigue en memoria y se avisa una vez. Una versión futura no se carga: se aparta en .unreadable · Save & Cómic · localStorage no tiene transacciones.
- 2026-10-24 · Cada viñeta guarda la apariencia del jugador del momento del evento. Cambiarse de ropa después no reescribe la historia · Save & Cómic · el cómic cuenta lo que pasó.
- 2026-10-24 · El PDF sigue sin librerías (JPEG con DCTDecode, una página): jsPDF (~300 KB) no aporta nada para una sola imagen. La entrega usa la capacidad `downloads`; sin ella, en el visor se copia al portapapeles o la imagen queda a la vista con los botones Abrir y Copiar. `<a download>` solo fuera del visor · Save & Cómic · en el visor el enlace no funciona.
- 2026-10-24 · `?partida=<id>` aísla la clave de guardado de una pestaña; `AV.saveTest`/`AV.comicTest` usan claves aisladas y dejan G.S y la partida real como estaban · Save & Cómic · varios agentes prueban en el mismo origen.

2026-10-24 · v20 publicada desde f3ed616 (estable). Cómic declara la capacidad downloads del visor para guardar el PNG · coordinador · el estudiante guarda su cómic con confirmación
2026-10-24 · Directiva V7.0: nuevo AV-ENGINE-AUDITOR independiente (auditoría de motores, sin autorización de migración), aislado en worktree auditoria-motores desde estable · Kelvin/coordinador · decidir motor con evidencia sin frenar el juego
2026-10-24 · Edificios de Kelvin: hoy 21 de 74 modelos y 29 de 377 instancias. Se convierten los 53 restantes (agente de edificios), se reproduce su layout de 3ds Max (level designer) y entra la carga por zona con LOD (nuevo ingeniero de streaming) · Kelvin/coordinador · usar sus edificios tal cual sin romper la descarga en escuelas
