# Amazona Verse: prototipo del juego (hito 1)

Primer capítulo jugable: **"La primera reconstrucción"** (título provisional). Web 3D con Three.js r128.

## Cómo correrlo
```
python3 -m http.server 8765 --directory ~/AmazonaVerse/Juego
```
Después abre http://localhost:8765 en el navegador. Hace falta un servidor; abrir `index.html` con doble clic no carga las texturas.

## Controles
- Escritorio: WASD o flechas para mover · Espacio para saltar (mantener para planear) · E o Enter para Acción · Q/R o arrastrar el ratón para girar la cámara · Esc para cancelar.
- Móvil: joystick a la izquierda · botones Saltar y Acción a la derecha · arrastrar la pantalla para girar la cámara.

## Prueba automática
En la consola del navegador: `AV.selfTest()` recorre el capítulo completo, las dos rutas, guardar/cargar y las partidas dañadas.
