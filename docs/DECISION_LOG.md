# DECISION_LOG · página web

Formato: fecha · decisión · quién · por qué.

- 2026-10-24 · Estructura de 13 bloques (hero, hechos, historia, aprender, Modo Maestro, ropero, criadero, conservación + Hecho en PR, tecnología, escuelas, familias/aliados/inversionistas, prensa, contacto) · Web lead; aprobada por el comité de pitch · Objetivo n.º 1: que una escuela pida un piloto gratis.
- 2026-10-24 · Mismo design system que el juego (tokens de `src/ui/tokens.css`, Fredoka + Atkinson Hyperlegible, botón caramelo, vidrio y papel, iconos del catálogo de `ui.css`) y el logo SVG de la portada del juego · Web lead · La web debe sentirse de la misma familia.
- 2026-10-24 · Un solo look oscuro (noche de selva) con secciones de papel tipo Diario de Campo; sin tema claro · Web lead · Es la marca del juego; los colores se fijan explícitos.
- 2026-10-24 · ES/EN en el mismo HTML, con selector que recuerda la elección (localStorage con try/catch); ES por defecto · Web lead · Funciona sin JS y sin build.
- 2026-10-24 · Correo de contacto en la variable `AV_WEB.correo`, marcado "por confirmar" · Comité · No se inventa un dominio; lo decide Kelvin.
- 2026-10-24 · Licencia escolar: "precio tras el piloto"; no se publica el ~$4/estudiante · Comité · Nada se cobra antes de la revisión COPPA.
- 2026-10-24 · Sin botón "Jugar demo" · Comité · No hay link jugable público; el CTA principal es pedir el piloto y el hero lleva el loop del juego.
- 2026-10-24 · Prensa firmada "Equipo Amazona Verse · Puerto Rico", sin nombre del fundador · Comité · Datos personales: hasta que Kelvin lo apruebe.
- 2026-10-24 · Textos iguales al video pitch (lema de cierre, "Crecemos de maestro a maestro", "Pensado para Chromebooks; pruebas en dispositivos reales en curso", "WebAssembly solo donde aporta", modelo y pedido a inversionistas) · Comité · Web y pitch dicen lo mismo.
- 2026-10-24 · Cifras de mercado (98,577 escuelas públicas, 29 % hispanos, NCES) solo en el bloque de inversionistas y con enlace a la fuente · Comité (Growth) · No inventar cifras; no hay cifra oficial reciente de escuelas de PR.
- 2026-10-24 · Criadero como "Próximamente": "Tu cotorra crece con lo que aprendes: huevo, bebé, juvenil, adulta"; sin azar ni compras; nunca enferma ni muere; capa real de los aviarios Iguaca y José L. Vivaldi · Comité + game designer de huevos · Está en desarrollo y no puede sonar a loot box.
- 2026-10-24 · Conservación: solo datos marcados "verificado" en `content/cap1/lecciones.js` (USFWS 2026, USDA FS). No se usa "13 cotorras en 1975" (parcial) · Web lead · Lo no validado no se publica.
- 2026-10-24 · Se excluye de la web el conjunto 1 de `ropero_conjuntos.png` (bandera envuelta en la gorra y banderita con el triángulo del lado libre); se usa la fila frontal de los conjuntos 2 a 6 · Web lead; confirmado por el comité · `BANDERA_PR_GUIA.md`.
- 2026-10-24 · No se usan capturas que muestran "Anillos 7/7" ni la ficha "Pava jíbara (los 7 anillos)", ni el Diario con fichas sin validar · Web lead · Los anillos ya no van y las fichas no están validadas.
- 2026-10-24 · Bandera solo como `assets/img/bandera-pr.svg` (copia exacta de la referencia) en "Hecho en Puerto Rico", la franja de hechos y el pie; nunca junto a precios · Web lead · Guía de bandera.
- 2026-10-24 · Póster del hero: render del kit de entorno (`entorno_kit.png`, Vittata en el bosque); el loop saldrá de `gancho_vuelo_mirador` y `mundo_dron_dosel` · Web lead + comité · Video del juego, no capturas; el póster cubre mientras llega.
- 2026-10-24 · Demo "¿Dónde construirías?" con los datos reales de los terrenos A y B (`content/cap1/mundo.js`) y las líneas de Luma de `dialogos_cap1` · Web lead · Muestra el aprendizaje con evidencia (O6) mejor que una captura.
- 2026-10-24 · "La ruta de la gota" se marca "En desarrollo" y la alineación DEPR/NGSS como "propuesta, en revisión con maestros" · Web lead · `EDUCATIVO.md` está en estado PROPUESTA.
- 2026-10-24 · Piloto: "El capítulo 1 jugable, en el navegador" (no "completo") · Comité · Es un prototipo; no prometer de más.
- 2026-10-24 · Espacio para el video pitch (2:45) en Prensa, oculto hasta que exista, con subtítulos ES/EN en borrador · Comité + Web lead · Se suma cuando el editor entregue el corte final.
- 2026-10-24 · Los videos se declaran en `assets/video/videos.json` en vez de comprobar si existen · Web lead · Evita peticiones 404 y errores en consola mientras no hay archivos.
- 2026-10-24 · Las animaciones de entrada solo mueven (sin opacidad 0) · Web lead · La página se ve completa en cualquier captura o miniatura.
- 2026-10-24 · Subtítulos del pitch ajustados a `tiempos.json` (FINAL v1; B10 empieza en 141.6) y a las pausas medidas en `stems/voz.wav` · Sonido + Web lead · El archivo del sonido manda sobre `vo_bloques.json`.
- 2026-10-24 · Loop del hero publicado (hero.mp4, 8.6 s, 3.0 MB, sin audio); el póster sigue siendo el render del bosque y el video entra con fundido · Editor de video + Web lead · El primer cuadro del loop es menos atractivo como imagen fija y en movimiento reducido se queda la imagen.
- 2026-10-25 · Video pitch publicado en Prensa (pitch.mp4, 2:45.6, 12,9 MB, 960×540; póster pitch.jpg; subtítulos ES/EN) · Video (relevo) + Web lead · El comité pidió sumarlo cuando estuviera el corte final; solo carga al pulsar Play.
