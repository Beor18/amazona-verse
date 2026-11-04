# Rendimiento de los módulos nuevos (CG-47)

Medido en la prueba `AV.rendimientoModulosTest` (build `cg-47-f2ecc4ae`, Chrome con SwiftShader). Cada cifra es la media de 500 llamadas a `paso` en el hilo del juego. El tope es **0,5 ms por módulo** y **2 ms entre los seis**.

Perfil de la medida «lejos»: calidad **baja**, `G.quiet`, jugador en el origen (fuera de Villa Raíz y de la ciudad). Perfil «cerca»: calidad **media**, sin silencio, en Villa Raíz (125, 140), volando.

| Módulo | Lejos o en silencio | Cerca | Tope |
|---|---|---|---|
| trucos | 0,0002 ms | 0,0006 ms | 0,5 ms |
| humor | 0,0000 ms | 0,0010 ms | 0,5 ms |
| escondite | 0,0002 ms | 0,0000 ms (no hay partida) | 0,5 ms |
| vecinos | 0,0002 ms | 0,0046 ms | 0,5 ms |
| sorpresas | 0,0000 ms | 0,0002 ms | 0,5 ms |
| Maraña | 0,0000 ms | 0,0022 ms | 0,5 ms |
| **Los seis** | **0,0006 ms** | **0,0086 ms** | **2 ms** |

En calidad baja los vecinos no se siembran y la Maraña no actualiza matrices. Lejos, los dos salen sin recorrer el comportamiento. En silencio (`G.quiet`) los seis vuelven al momento. Ninguno crea objetos dentro de `paso`.

Ciudad viva y comunidades no se tocaron: en calidad baja el arranque no las carga (`boot.js`) y, lejos de su sitio, `paso` regresa sin poblar. Dibujan en las dos mallas de la bandada (0 draw calls propios). El FPS en un iPhone real lo mide Kimi.

La prueba quedó 21/21. Las 12 baterías de la misma build, en el informe de `test.sh`.
