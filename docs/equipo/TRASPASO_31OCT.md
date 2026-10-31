# Traspaso al Claude que toma el mando de la Mac · 31-oct-2026

Escrito por el agente web (Claude en claude.ai/code) a pedido de Kelvin. Léelo entero antes de tocar nada; después sigue `docs/equipo/COORDINACION_VIVO.md` (protocolo de reanudar) y la tabla «Estado» de `TAREAS_API.md`.

## 1. Dónde estamos
- **Web publicada:** amazonaverse.com sirve `eac0015` (commit de sitio `7b46fac`, 31-oct). Incluye todo lo del 30-oct, la cámara que mira al cielo (`b1f3755`), Maze fuera del menú (`eac0015`) y la pastilla de avance «◔ NN%» abajo a la derecha (lee `progreso.json`, que escribe `tools/build/sitio.sh` con `tools/build/progreso.sh`).
- **Las dos últimas publicaciones fueron FORZADAS por Kelvin** desde la nube con dos fallos conocidos: `e2eTest` 8/10 (paso 4.2, la charla con Iguaca en la copa: en la build de la nube la lista de interacción sale vacía; en la Mac con GPU pasa 47/47) y `movementTest` 48/49 (solo «Arranque … 0,18 s», que mide la GPU). Las otras 10 obligatorias en verde, 0 errores de consola.
- **BM76 (vuelo):** la Mac la marcó «hecha sin cambio de código» (49/49 dos veces en `9c1dcd9`), pero el publicador de la Mac dio 46/49 en `5e02095` (cernido 4,96 m, rama, subir trabada 24 cuadros). Es intermitente con GPU real. Pistas en la fila BM76 de `TAREAS_API.md` (sospecha: calidad «alto» y qué sólidos/ramas hay junto al sitio de prueba). No desactives ni rebajes casos.
- **`main` va por delante de lo publicado:** cambios de la Mac (p. ej. `dfe2a20`, `terreno.js`) salen en la próxima publicación.

## 2. Tu trabajo, en orden
1. **Mantener la Mac produciendo y publicando sola**:
   - Un trabajador = un clon propio (la carpeta compartida `~/AmazonaVerse/juego_api` causó la copia «112 commits atrasada» y bloqueó BM56–BM69). Si no da tiempo, al menos no dejes cambios sin commit en esa carpeta.
   - Exporta el Python de Blender antes de lanzar trabajadores (BM57/BM58/BM59/BM63 se bloquearon «sin python de Blender»): `export AV_PYTHON=~/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11`
   - Publicador: `caffeinate -i tools/build/publicar_mac.sh --continuo` (publica solo si las pruebas pasan). `--igual` salta TODAS las pruebas: solo para una publicación puntual que Kelvin pida, nunca en `--continuo`.
2. **BM76** hasta que `movementTest` pase 49/49 de forma estable con GPU real (si no, el publicador nunca publica solo).
3. **Mapa con los GLB de Kelvin, BM77 → BM81** (detalle en `TAREAS_API.md`): `~/AmazonaVerse/glb_kelvin/mapa/mapa.glb` (107 MB) y `~/AmazonaVerse/glb_kelvin/edificios/edificios.glb` (1,0 GB), fuera del repo. Primero inventario y separar por nodo en `~/AmazonaVerse/glb_kelvin/piezas/`; después edificios, Ciudad de los 36 (meta `docs/img/ciudad_tepuy_meta_kelvin.jpg`), los 14 asentamientos y el terreno. El diseño de Kelvin no se cambia; un problema por commit con captura antes/después; nunca subas archivos de más de 100 MB; los `*_glb.js` se regeneran desde su `.glb` (hay 8 desfasados según el build).
4. Backlog visual BM56–BM69 re-evaluado con lo que dejen BM77–BM81 (lista viva en `docs/equipo/VISUAL_30OCT.md`).
5. Investigar por qué el paso 4.2 de `e2eTest` falla solo en la build de la nube (`G.interaccion.list` vacía en la copa), para que la nube también pueda publicar sin forzar.

## 3. Reglas que no se rompen
Una sola rama `main` (o `api-*`, que se une sola); nunca `--force`; commits pequeños; nunca claves en archivos; Vittata, la bandera, el arte, el dinero y lo legal son de Kelvin (anótalo en `DECISION_LOG.md`); las decisiones de historia están delegadas (`CRITERIOS_HISTORIA.md`); no inventes datos educativos; **Maze está congelado** (fuera del menú, sin trabajo nuevo) y **el tren sigue oculto**; marca «EN CURSO» en `COORDINACION_VIVO.md` antes de cada tarea para no duplicar con el agente web.

## 4. Carriles
- **Mac (tú):** motor y gráficos (`src/engine/*` de render, `look.js`, `tools/blender/*`), los GLB, rendimiento con GPU, publicar.
- **Agente web (Claude en la nube):** contenido, historia, inglés, accesibilidad, web, QA sin GPU. Hoy hizo: cámara al cielo, Maze fuera, ayuda de controles, pastilla de avance restaurada (la unión `2451709` la había borrado junto con la portada de AP5: cuidado al resolver conflictos de `web/index.html`, conserva ambas partes).

## 5. Pendiente de Kelvin
Revisar el mapa con las capturas nuevas; las 11 cotorras sin piel (QA-66); D2 (las voces se ven: arte); revisar las decisiones [DECIDIDO-EQUIPO]; legal (política de privacidad y programa de seguridad, `SEGURIDAD_INFANTIL.md` ítems 12 y 13); probar en móviles reales y con niños.
