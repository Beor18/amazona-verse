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
En la consola del navegador: `await AV.selfTest({saveFiles: true})` recorre el capítulo, el creador, el cómic, la exportación y el guardado (45 comprobaciones) y deja los archivos exportados en `tests/out/`.
También: `AV.missionTest()` (misiones, Diario y ropa), `AV.accessoryTest()` (personaje 3D) y `AV.templateTest()` (la plantilla arranca otro juego con el mismo motor).

## Arquitectura
Motor en `src/engine` y `src/game`, contenido en `content/cap1` y una plantilla en `content/plantilla` (`index.html?pack=plantilla`). Capas, contratos y cómo forkear: `docs/ARQUITECTURA.md`.
