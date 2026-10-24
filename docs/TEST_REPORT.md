# TEST_REPORT · 24 oct 2026

**Entorno:** macOS 26.6.2, Chromium del panel de Claude, `tests/server.py`, Three.js r128.
**Comando:** `await AV.selfTest({saveFiles:true})`.
**Resultado:** **45/45**.

Cubre: creador (nombres no válidos rechazados, personaje guardado, aprendiz visible) · capítulo completo con ruta río→corrección→colina · esquema de cada evento · los eventos no contienen el nombre del jugador · serialización ida y vuelta · cómic con 4 viñetas solo de eventos reales · reordenar y editar viñetas · 8 diseños sin solapes · PNG 1080×1520 decodificado · PDF con cabecera y cierre · archivos guardados en disco · guardar, reiniciar y cargar · migración v2→v3 · partida dañada copiada y rechazada · v1 rechazada · ruta colina directa · sin viñeta final si no se completa.

**Inspección manual de archivos:** `comic.png` (1080×1520, viñetas y textos correctos), `comic.pdf` (1 página; `file` y PDFKit de macOS lo abren; renderizado y revisado como imagen), `retrato.png` (256×256, gafas y pañuelo visibles).

**Vistas revisadas:** escritorio 800×600 y móvil 375×812 (capturas).

**No probado:** iPhone y Android reales, Safari, rendimiento, controles táctiles con dedos reales, lectores de pantalla.
