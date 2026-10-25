# Amazona Verse

Juego educativo 3D para el navegador, para escuelas (grados 3 a 6). Lo protagoniza Vittata, la cotorra puertorriqueña.

Capítulo 1 jugable: **"El día que el cielo se rompió"** (guion de Kelvin García). Ciencias alineadas al DEPR 2022 y NGSS, sin cuentas ni anuncios.

**Jugar:** https://amazona-verse.vercel.app (landing) · https://amazona-verse.vercel.app/juego/ (juego)

**Estado:** versión 25. Qué falta y fechas estimadas: **[ROADMAP.md](ROADMAP.md)**.

## Cómo correrlo
Hace falta un servidor local: abrir `index.html` con doble clic no carga los modelos.
```
python3 -m http.server 8765
```
Después abre http://localhost:8765 en el navegador.

## Controles
- **Escritorio:**
  - WASD o flechas: moverse.
  - Espacio: saltar y volar (mantener para planear).
  - V: aterrizar.
  - E o Enter: acción.
  - Q/R o arrastrar el ratón: girar la cámara.
  - Esc: cancelar.
- **Móvil:** joystick a la izquierda, botones de vuelo y acción a la derecha; arrastrar la pantalla gira la cámara.
- `#fps` al final de la URL muestra un panel de rendimiento: FPS, llamadas de dibujo y memoria.

## Build y pruebas
```
tools/build/build.sh HEAD
tools/build/test.sh tools/build/salida/<ref>/ --extra
```
- **`build.sh`** exporta un commit sin tocar la copia de trabajo y deja `site/` listo para publicar, con su manifiesto. Comprime con meshopt y WebP y valida las referencias.
- **`test.sh`** levanta la build y corre las 13 baterías: `selfTest`, `missionTest`, `accessoryTest`, `templateTest`, `eduTest`, `maestroTest`, `criaderoTest`, `movementTest`, `saveTest`, `comicTest`, `e2eTest`, `contextTest` y `streamingTest`. También mide la carga inicial; el presupuesto es ≤ 8 MB.
- Más detalle en `docs/equipo/BUILD.md`. Las baterías también se pueden correr a mano desde la consola, por ejemplo `await AV.selfTest()`.

## Aula
Menú de pausa → **Aula**:
- Idioma de la lección en ES/EN.
- Texto corto.
- Lectura en voz alta.

Al pie, **Docentes** abre el Modo Maestro, protegido con una suma (no hay cuentas). Incluye:
- Guía de 45 minutos.
- Progreso de este dispositivo.
- Paradas de aprendizaje.
- Criadero.
- Reporte en CSV o JSON, sin datos personales.

## Arquitectura
- **Motor:** `src/engine` y `src/game`, con el personaje en `src/personaje`.
- **Contenido:** `content/cap1`, más los datos comunes en `content/comun` (huevos y especies) y una plantilla en `content/plantilla` (`index.html?pack=plantilla`).
- **Landing:** `web/` (página del producto).
- **Sitio publicable:** `sitio/` (landing en la raíz + juego en `/juego/`), generado con `tools/build/sitio.sh <build>/site`. Vercel publica `main` con Root Directory `sitio`.
- **Herramientas:** de Blender, build y video en `tools/`.
- Capas, contratos y cómo hacer un fork: `docs/ARQUITECTURA.md`.

## Licencias
- **Código y contenido:** © Kelvin García / Amazona Verse.
- **Three.js** (MIT) y **meshoptimizer** (MIT).
- **Fuentes:** Fredoka y Atkinson Hyperlegible (OFL).
- **Edificios:** derivados de kits de KitBash3D, usados bajo la licencia de Kelvin. Cada recurso de terceros conserva su propia licencia.
