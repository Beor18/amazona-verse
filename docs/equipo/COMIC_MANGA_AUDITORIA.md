# Auditoría · Manga Toon Story Creator (BG1, G17)

**Fecha:** 27-oct-2026. **Para:** el prototipo `?manga=demo` (`src/game/manga.js`). **No cambia código del juego.**
**Meta visual:** `docs/img/referencia_manga_toon.webp` (Kelvin, directiva en `COMIC_MANGA_DIRECTIVA.md`).
**Límite:** `src/game/comic.js` sigue siendo el cómic publicado hasta que Kelvin apruebe el prototipo. `renderer.js` no se toca (AJ1 lo tiene en curso).

## 1. El generador actual (`src/game/comic.js`)

Qué captura. Si un evento de `G.eventos` tiene viñeta en el pack, guarda el look de ese instante en `S.comic.vinetas[id]` y, si no hay foto, llama a `capture()`: `G.renderer.snapshot(480, 360, 0.72)` desde la cámara del juego. Las posadas (`encuadre: 'posada'`) buscan un ángulo libre con `fotoPosada()` y devuelven la cámara a su sitio. Sin lienzo (QA-21) la captura queda pendiente y se reintenta. El retrato 3D sale de `AVCharacter.renderPortrait` (el mismo rig).

Cómo se compone. Página 1080×1520 (más alta si hay más de 4 viñetas). Portada y una cuadrícula o tira (`comicLayout`): marcos de tinta parejos, pie de texto elegido de una lista (sin texto libre). No hay globos, onomatopeyas, viñetas de distinto tamaño ni las dos enseñanzas de la directiva.

Cómo exporta. `exportComic`: PNG verificado (firma e IHDR) o PDF de una página con el JPEG embebido. Si el lienzo se contamina, recompone. La entrega usa la capacidad `downloads` del visor, el portapapeles o un enlace. Registra `ComicExported`. `pngSinRegistro` arma el mismo PNG sin aviso, sin evento y sin guardado (lo usa Compartir).

Cómo guarda. `S.comic` (viñetas con look y orden, índice de texto, título de la lista) y `S.captures` (JPEG en data URL). `G.guardado.autosave()`. No pide el nombre real: el título es uno de la lista del pack.

## 2. Eventos que ya existen y la línea de tiempo (§ 6)

El registro narrativo es `S.events` (`src/game/eventos.js`): clave, tipo, capítulo, lugar, personajes del pack y `meta`. No guarda nombre real, posición continua ni video.

Sirven para una historia (ya están en `S.events`):

| Momento de § 6 | Qué hay hoy |
|---|---|
| Inicio | `PlayerCharacterCreated` |
| Decisión de la historia | cap. 1: `LandSelected`, `ShelterRelocated`, `LumaChoice`. Ep. 2–6: elecciones (`ListenChoice`, `HelmChosen`, `TradeoffSeen`, `FragmentsOrdered`, `PlanMade`…) |
| Dificultad | `FirstHardLanding`, `FirstSplash`, `ShelterFlooded`; en el ep. 4 `ModelTested` |
| Récord | `FirstChallengeRecord` (el primer «¡Nuevo récord!» de Retos, una vez por partida; `src/game/momentos.js`) |
| Meta de capítulo | `ChapterCompleted`, `LocationDiscoveredMirador` |
| Partida a medias | no hay evento propio: es la ausencia de `ChapterCompleted` |

También entran al cómic, no a la línea de vuelo: `FieldEntryFound`, `OutfitUnlocked`, `MissionCompleted`, `PhotoTaken`, `ChickJumped`, `NestAppeared`, `ChickHatched`, `FirstRoofPerch`, `FirstHighBranchPerch`.

No están, y el prototipo no los inventa:

| Momento de § 6 | Hueco |
|---|---|
| Cambio de ruta, retroceso | no hay evento de giro ni de vuelta atrás. Una decisión de misión no es un desvío al volar |
| Fallo y nuevo intento | los minijuegos suman `jugadas` en Mis récords y no dejan una viñeta por intento |
| Mejora de tiempo | el número vive en el almacén de récords, no en `S.events`, salvo el primer récord de Retos |
| Meta de una carrera | `retosResultado` trae `llego` y el tiempo, y solo el primer récord pasa a `S.events` |

Minijuegos (récord numérico en `src/game/records.js`, sin datos personales y sin ruta):

| Modo | Dónde | Qué guarda | ¿Línea de tiempo? |
|---|---|---|---|
| Retos: carrera, río, tormenta, banquete | `amazonaverse.retos` y el gancho `retosResultado` | mejor tiempo o puntos, puesto, jugadas | no |
| Amazona Flight | `flight.mejor` (obstáculos) | marca y jugadas | no |
| River Rush | `rio_rush` | marca y jugadas | no |
| El tren | `tren` | puntuación y jugadas | no |
| Amazona Maze | `maze` | marca y jugadas | no |

Los capítulos 2 a 6 tienen sus propios `eventos.defs` en cada `pack.js` (decisiones y metas de esa historia). No describen una carrera.

Conclusión para § 6: hoy se puede contar el capítulo y el primer récord. No se puede reconstruir «me perdí, volví, lo intenté otra vez» sin inventar. El prototipo lo dice en pantalla («Muestra. Tú escribes lo que pasó.») y deja los textos editables. Cuando existan esos eventos, las mismas 6 viñetas pueden leerlos; hasta entonces no se presentan como telemetría.

## 3. Cotorras oficiales

Un solo rig: `assets/models/vittata.glb`, montado por `src/personaje/character.js`. No hay otro cuerpo. Las especies son piel o tinte encima de ese rig (`content/comun/especies.js`: 36 fichas, 34 vivas y 2 extintas; 21 traen campo `piel`). `src/personaje/pieles.js` habla de 22 JPG en `assets/textures/pieles/`. Vittata es el modelo base, sin piel encima.

Clips que el juego usa del glTF: `Idle`, `Walk`, `Welcome`, `Celebrate`. El vuelo, el planeo, el nado y las expresiones los arma el código (`ANIM.wings` y `face()`): `neutral`, `happy`, `surprised`, `sad`, `curious`, `angry`, `idea`, `fight`, `annoyed`. Gestos de `actores.js`: saludar, celebrar, bailar, idea, enojo, pelea, molestia.

Bebés y juveniles: el mismo modelo, no una malla aparte (`content/comun/huevos.js`). Bebé, niveles 1–5, escala 0,5 y plumón. Juvenil, niveles 6–15, escala 0,76. Adulto, escala 1, sin plumón. El prototipo no ofrece cómics de bebés: la directiva pide diseños oficiales aprobados, y no hay un modelo de pichón distinto.

El prototipo usa solo a Vittata (especie `vittata`), con los accesorios oficiales que ya lleve la partida. No hay selector de especies inventadas ni de colores nuevos.

## 4. Cámaras, toon y contorno

- Cámara de juego: `src/engine/camara.js` (`place`, seguimiento). El lienzo y el post están en `src/engine/renderer.js`: `drawScene`, `snapshot`, bloom y gradación en calidad alta. No hay pase de contorno.
- Look de fábrica `vibrant_toon` (`src/game/look.js`): rampa toon suave en la luz de Phong y Lambert, color tropical, cielo atmosférico. No es un cel shading de tinta.
- El contorno manga del prototipo se hace en 2D, en `manga.js`, sobre la foto ya renderizada (saturación, posterizado leve, Sobel). Así no se edita `renderer.js`.

## 5. Plan del prototipo (BG2 y BG3)

1. Módulo aparte `src/game/manga.js`, carga perezosa. Se abre con `?manga=demo` o `AV.manga()`. No está en el menú. `comic.js` no se modifica.
2. Seis cámaras alrededor de Vittata, en la escena que ya está cargada. Cada toma guarda y devuelve la cámara y la pose. Post manga en el lienzo de la viñeta: tinta, líneas de velocidad, letreros dibujados (Salida, cruce, «???», anillos, meta).
3. Textos editables: título, nombre de la cotorra (no el nombre real), globos, onomatopeya, cierre, «¿Qué aprendí?» y «Mi enseñanza de vida». La historia de muestra es la de la directiva § 10 y está marcada como muestra.
4. Última franja con las dos enseñanzas y un retrato oficial (`renderPortrait`).
5. Marco de 375×812 para la vista móvil. PNG de la página (firma comprobada), sin pedir permiso de adulto para descargar. Compartir pasa por la puerta que ya existe en `records.js`, si ese módulo carga.
6. Segunda pasada (BG3), en el mismo prototipo: color más saturado, viñetas de distinta altura, globos con cola, rótulos de madera, tipografía grande y las enseñanzas como fichas, no como un pie escolar. Si una toma sale vacía, se repite desde más arriba una vez.
