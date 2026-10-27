# Rendimiento en el móvil (RN1, rescatado en AZ1)

## Qué cambia en el juego (`src/engine/renderer.js`)
- **Antes:** la resolución dinámica (`adaptDPR`) solo miraba la media de los cuadros. En un móvil o Chromebook con objetivo de 30 FPS, una media aceptable escondía tirones: cuadros de 40–60 ms cada pocos segundos que no la mueven.
- **Ahora:**
  - Se guardan los últimos 120 cuadros y cada segundo se calcula su **p95**.
  - Con objetivo ≤ 30 FPS, un p95 por encima de 42 ms cuenta como «lento», igual que una media de más de 20,5 ms. Baja la resolución de a 0,25.
  - Si la media pasa de 45 ms (menos de ~22 FPS), la resolución baja de a 0,5 y **sin esperar al segundo conteo**. Antes tardaba unos 6 s en llegar al mínimo.
  - Para volver a subir hace falta media < 17,6 ms **y** p95 < 24 ms.
  - El ajuste de calidad (`fpsM`) también baja un nivel con tirones: p95 > ~52 ms con objetivo ≤ 30 FPS, solo cuando la resolución ya está en su mínimo.
  - Cada cambio de resolución vacía la ventana del p95.
- **En escritorio no cambia nada:** el objetivo es 60 y la regla del p95 no se aplica.

## Cómo se mide (`tools/build/movil_modos.py`)
- **Escenarios nuevos de RN1:** `arranque`, `bosque`, `ciudad` (la villa del mapa), `caleta` (la bahía bioluminiscente), `river` y `tren`. Se suman a los de AF1.
- **Ejemplo:** `python3.11 -I tools/build/movil_modos.py --raiz <build> --modos arranque,bosque,ciudad,caleta,river,tren --cpu 4 --segundos 12`.
- **Opciones nuevas:**
  - `--carga`: CPU lenta también durante la carga, para medir el tiempo hasta poder jugar.
  - `--pack epN`: mide un capítulo.
  - `--js <archivo>`: diagnóstico tras el flujo de jugador nuevo.
- **Qué da cada modo, además de lo de AF1:**
  - la traza por segundo de dpr y calidad;
  - la media y el p95 del final;
  - geometrías, texturas y heap.

## Lo medido
- En el rescate (AZ1, 27-oct, 09:00–10:30) la Mac estuvo a carga 18–32 y no se anotaron cifras.
- **BI1 (27-oct, 15:00–15:15).** Builds de `main` (`f6012fe`) y del commit anterior a RN1 (`512ca50`), en carpetas `tools/build/salida/bi1-*`. Mismos argumentos para las dos: `movil_modos.py --raiz <build>/site --calidad medio --segundos 12 --cpu 4|6`, y el capítulo con `--pack ep2`. «Bosque» es el vuelo desde el inicio (en `main`, el bosque nuevo de AW2); «ciudad» es la villa. La Mac seguía cargada (carga 11–22 durante las medidas), así que las cifras son un techo: en reposo solo pueden mejorar.
- **Resultado:** en calidad «medio» **ningún escenario pasa de 33 ms de p95**; el peor es 16,8 ms. Todo va pegado a los 60 FPS del vsync con dpr 1,5 fijo: ni la resolución ni la calidad cambian en los 12 s. No hizo falta arreglar nada. El margen está en el JS por cuadro (≤ 10 ms de media con CPU 6×).

| Escenario | CPU | Antes de RN1 · FPS / p95 / >50 ms / JS | `main` · FPS / p95 / >50 ms / JS |
|---|---|---|---|
| Arranque | 4× | 60 / 16,8 / 0 / 3,7 ms | 60 / 16,8 / 0 / 4,1 ms |
| Bosque | 4× | 60 / 16,8 / 0 / 6,3 ms | 60 / 16,7 / 0 / 5,5 ms |
| Ciudad | 4× | 60 / 16,7 / 0 / 4,4 ms | 60 / 16,8 / 0 / 4,8 ms |
| Flight | 4× | 60 / 16,8 / 0 / 3,0 ms | 60 / 16,8 / 0 / 3,7 ms |
| Capítulo 2 (arranque) | 4× | 60 / 16,7 / 0 / 1,8 ms | 60 / 16,8 / 0 / 1,9 ms |
| Capítulo 2 (vuelo) | 4× | 60 / 16,8 / 0 / 1,8 ms | 60 / 16,8 / 0 / 2,8 ms |
| Arranque | 6× | 60 / 16,7 / 0 / 5,2 ms | 60 / 16,8 / 0 / 5,0 ms |
| Bosque | 6× | 59 / 16,8 / 0 / 6,6 ms | 58 / 16,8 / 0 / 9,7 ms |
| Ciudad | 6× | 59 / 16,8 / 1 / 7,3 ms | 60 / 16,8 / 0 / 6,6 ms |
| Flight | 6× | 60 / 16,7 / 0 / 5,7 ms | 60 / 16,8 / 0 / 6,6 ms |
| Capítulo 2 (arranque) | 6× | 60 / 16,8 / 0 / 2,8 ms | 60 / 16,7 / 0 / 3,1 ms |
| Capítulo 2 (vuelo) | 6× | 60 / 16,7 / 0 / 2,4 ms | 60 / 16,7 / 0 / 3,2 ms |

- **Cómo leerla:** la CPU lenta emula el procesador del móvil, pero la GPU es la de la Mac, así que el p95 no ve el coste de dibujo de un móvil real. Lo que más sube con CPU 6× es el bosque de `main` (JS 9,7 ms de media, peor cuadro de JS 49 ms, 2 tareas largas): es el streaming del bosque nuevo y es lo primero que vigilar en un móvil real. La regla del p95 de RN1 no llega a actuar porque nunca se pasa de 42 ms.
- **Cómo medir de nuevo:** con la Mac en reposo, sobre la build de `main` y la del commit anterior a RN1, con los mismos argumentos. Hay que anotar aquí los FPS, el p95 y los tirones de más de 50 ms de cada escenario.
- **Ya medido antes:** QA-52 (texturas del cap. 1 por encima del presupuesto en «bajo») y QA-53 (congelado al pulsar «Empezar») siguen abiertos en `BUGS.md`. RN1 no los arregla: los tirones que vienen de la carga de texturas no dependen de la resolución.
