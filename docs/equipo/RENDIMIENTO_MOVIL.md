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
- **Pendiente.** El trabajo se cortó con el apagón del 27-oct antes de guardar ninguna medida.
- En el rescate (AZ1, 27-oct, 09:00–10:30) la Mac estuvo todo el tiempo a carga 18–32, con tres builds y pruebas de otros carriles a la vez. Con esa carga, los milisegundos no sirven para comparar: missionTest tardaba 96 s y lo normal son 6 s. Por eso no se anotan cifras.
- **Cómo medir:** con la Mac en reposo, sobre la build de `main` y la del commit anterior a RN1, con los mismos argumentos. Hay que anotar aquí los FPS, el p95 y los tirones de más de 50 ms de cada escenario.
- **Ya medido antes:** QA-52 (texturas del cap. 1 por encima del presupuesto en «bajo») y QA-53 (congelado al pulsar «Empezar») siguen abiertos en `BUGS.md`. RN1 no los arregla: los tirones que vienen de la carga de texturas no dependen de la resolución.
