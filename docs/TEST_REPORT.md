# TEST_REPORT · 24 oct 2026

**Cómo:** servidor local `python3 -m http.server`, navegador Chromium del panel de Claude y `AV.selfTest()` en la consola.

**Resultado:** 24 de 24 comprobaciones pasadas, después de corregir una comprobación que revisaba la lluvia un instante antes de tiempo.

Cubre: diálogo con Agilis · recolección e inventario · evaluación de los 2 terrenos · construcción rechazada fuera del terreno · construcción válida con consumo de materiales y colisión nueva · lluvia y subida del agua · refugio dañado en la orilla · indicadores · reparación del taller · pista · capítulo completado · guardar · reiniciar · cargar · partida dañada rechazada · partida de otra versión rechazada · ruta de la loma (refugio intacto).

**No probado todavía:** controles táctiles en iPhone o Android reales, rendimiento en móviles, Safari, partidas guardadas entre dos versiones distintas del juego.

**Corregido en esta prueba:** faltaba declarar UTF-8 (acentos rotos) y la regla que oculta paneles fuera del visor; las cotorras se veían oscuras por la codificación de color de la textura; los botones del sistema tapaban el inventario.
