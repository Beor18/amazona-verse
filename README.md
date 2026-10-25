# Amazona Verse: prototipo del juego

Capítulo 1 jugable: **"El día que el cielo se rompió"** (guion de Kelvin García). Web 3D con Three.js r128, creador de personaje y cómic personal exportable (PNG y PDF).

## Cómo correrlo
```
python3 ~/AmazonaVerse/Juego/tests/server.py 8765
```
Después abre http://localhost:8765 en el navegador. Hace falta un servidor; abrir `index.html` con doble clic no carga las texturas.

## Controles
- Escritorio: WASD o flechas para mover · Espacio para saltar (mantener para planear) · E o Enter para Acción · Q/R o arrastrar el ratón para girar la cámara · Esc para cancelar.
- Móvil: joystick a la izquierda · botones Saltar y Acción a la derecha · arrastrar la pantalla para girar la cámara.

## Prueba automática
En la consola del navegador: `await AV.selfTest({saveFiles: true})` recorre el capítulo (con la misión "La ruta de la gota"), el creador, el cómic, la exportación y el guardado (46 comprobaciones) y deja los archivos exportados en `tests/out/`.
También: `AV.missionTest()` (misiones, Diario y ropa), `AV.accessoryTest()` (personaje 3D), `AV.templateTest()` (la plantilla arranca otro juego con el mismo motor), `AV.eduTest()` (juega la misión educativa entera, en 3.º–4.º y 5.º–6.º) y `AV.maestroTest()` (acceso, guía, progreso y reporte del Modo Maestro).

## Aula
Menú de pausa → **Aula**: idioma ES/EN de la lección, texto corto y lectura en voz alta. Al pie, **Docentes** abre el Modo Maestro tras una suma (no hay cuentas): guía de 45 min, progreso de este dispositivo y reporte CSV/JSON sin datos personales.

## Arquitectura
Motor en `src/engine` y `src/game`, contenido en `content/cap1` y una plantilla en `content/plantilla` (`index.html?pack=plantilla`). Capas, contratos y cómo forkear: `docs/ARQUITECTURA.md`.
