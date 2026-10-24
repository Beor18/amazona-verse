# SESSION_HANDOFF · 24 oct 2026

**Estado:** el capítulo 1 se juega de principio a fin en el navegador, con creador de personaje y cómic exportable. Último commit: ver `git log`.

**Cómo correrlo:**
```
python3 ~/AmazonaVerse/Juego/tests/server.py 8765
```
Abrir http://localhost:8765. Link publicado: https://claude.ai/artifact/Bme89hzz2bA5f25BcRRexM

**Pruebas:** en la consola del navegador, `await AV.selfTest({saveFiles:true})`. Debe dar 48/48; además `await AV.accessoryTest()` debe dar 10/10 y dejar `tests/out/comic.png`, `comic.pdf` y `retrato.png`.

**Archivos clave:** `index.html` (interfaz), `game.js` (todo el juego), `assets/` (sprites, presets, modelos GLB), `tests/server.py`, `docs/`.

**Bloqueos:** diseño oficial de Vittata sin confirmar; texturas y rig del .blend ausentes; descarga del mapa incompleta y con riesgo de licencias; sin pruebas en dispositivos reales.

**Siguiente acción exacta:** que Kelvin juegue el link en su iPhone y reporte. Mientras tanto, empezar el BACKLOG #6 (bote: episodio 3 "Más allá de la bahía") en `game.js`, agregando pruebas a `selfTest`.
