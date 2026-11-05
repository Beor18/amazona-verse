# Reporte semanal V18.1 · semana 1 (hasta el 5-nov-2026)

**En una frase:** la demo V18.1 ya se juega en internet de punta a punta. Encuentras una cotorra, la desbloqueas, peleas un duelo, reparas el puente con lo que ganas, espantas la Sombra de Tormenta y van llegando cotorras nuevas. Todo se queda guardado al recargar.

## Demo
- **Dónde:** https://amazona-verse.vercel.app/juego/?v18=1 (sin `?v18=1` el juego sigue como antes).
- **Cómo jugarla en familia:** `docs/equipo/GUIA_DEMO_V18_1.md`.
- **Qué hay nuevo:** el duelo contra la Campeona; el puente colgante que se repara y ahora se cruza a pie; piedras y fibras para repararlo sin pelear; la Sombra de Tormenta; 4 cotorras con poderes nuevos (Quiebro, Ala fuerte, Lluvia de semillas y Ojo del cenote); y el duelo de 2 jugadores en la misma computadora.

## Video
- Hay un video real del ciclo en computadora: 1 min 16 s, grabado en la nube cuadro a cuadro y sin tarjeta gráfica. Está en la carpeta de trabajo de la coordinadora, todavía no en el repo. Se grabó antes del arreglo del puente a pie.
- **Falta:** el video en un iPhone o un iPad de verdad.

## Commits clave (main)
- 0c3d4dcc: el puente reparado se cruza a pie. Es la versión publicada (sitio 75d87eb3).
- aaf79783: 4 poderes y 4 cotorras nuevas.
- 519608c5 y ae551d24: la Sombra de Tormenta y sus correcciones.
- 33e8d838: duelo de 2 jugadores.
- fc8bd383: piedra y fibra recogibles.
- c9146761: el ciclo entero conectado.
- 9e1ca679: guía de la demo.

## Pruebas (en la versión publicada)
| Prueba | Resultado |
|---|---|
| Progreso V18 | 6/6 |
| Descubrir | 21/21 |
| Combate | 32/32 |
| Reparar | 27/27 |
| Ciclo | 22/22 |
| Sombra | 21/21 |
| Cotorras nuevas | 14/14 |
| Duelo de 2 | 23/23 |
| Efectos | 17/17 |
| Idioma | 31/31 |

Además, las 12 pruebas obligatorias del juego salieron en verde. Los Kimi lo validaron también con tarjeta gráfica real: 11 de 12 en verde, sin errores en la consola. La que falta es el fallo conocido de su banco de pruebas, no del juego.

## Fallos encontrados y corregidos hoy
- La Sombra salía antes de tiempo y no dejaba reparar el puente. Con la cotorra de Dominica era casi imposible ganarle. Abrir la pausa te quitaba plumas (QA-166 a 169).
- La Sombra no se veía en pantalla, aunque la pelea funcionaba (QA-170).
- En el duelo, los textos se mezclaban con el aviso de arriba. En el teléfono, el minimapa tapaba las plumas (QA-170 y 171).
- El puente reparado no se podía cruzar a pie (QA-172).

## Lo que sigue abierto
- **QA-165 (media):** un jugador nuevo no puede volver a Vittata después de elegir a la cotorra de Dominica, y entonces no le sale el reto extra. El arreglo ya está hecho y probado (7/7), pero no se ha subido.
- **QA-173 (baja):** en computadora, la tecla G lanza el poder y a la vez baja la cámara. Cambiar la tecla es una decisión de controles.
- **QA-174 (baja):** hay troncos dentro del círculo del duelo y a ratos tapan la cámara.
- **Falta:** el video en iPhone/iPad real y la ronda pequeña con niños, con permiso de sus padres.

## Siguiente objetivo: D14 (18-nov)
1. Subir el arreglo de QA-165 y despejar el círculo del duelo (QA-174).
2. Grabar el ciclo en un iPhone o iPad real y guardar los videos en el repo.
3. Que Kelvin juegue la demo con su hijo y nos cuente qué divierte, qué confunde y qué le hace querer repetir.
4. Kelvin decide la tecla del poder (QA-173).
