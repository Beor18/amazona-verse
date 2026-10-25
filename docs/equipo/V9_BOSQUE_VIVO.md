# V9 y V9.1: bosque vivo y ríos vivos (propuesta que Kelvin trajo de ChatGPT, 25-oct-2026)

Fuente: «Directiva maestra ilustrada V8 + V9 + V9.1», un PDF de 12 páginas. Sus imágenes son **conceptos**, no assets ni funciones que ya existan. Aquí se cruza con lo que hay en `main` y con las reglas de Kelvin.

## Lo que ya está hecho o en curso (no repetir)
| Propuesta | Estado en el juego |
|---|---|
| V8: auditoría de los primeros 10 minutos, bucles de juego, 5 mejoras | `DIVERSION_CAP1.md`; las 5 mejoras están en curso (Fable) |
| Carrera aérea corta con tiempo, récord y reinicio (P1) | **Hecho**: Modo Retos; en curso el fantasma y el contrarreloj del río (carril K) |
| Récords personales, fantasmas y retos asíncronos de la familia | Mis récords de la casa **hecho**; fantasma en curso (K1) |
| Buzón moderado de ideas, sin chat infantil | Propuesta en `COMUNIDAD_PROPUESTA.md` (solo formulario moderado) |
| Control de costos, reparto de modelos y registro por tarea | `REGISTRO_TAREAS.md`; topes en `tools/agente_api/limites.json` |
| Sonido ambiental | En curso: música y ambiente (`src/game/musica.js`) |
| Bandada y mundo con vida | En curso: bandada de cotorras (carril M) |
| Coquí reactivo | Parcial: coro y Simon de M3; falta coquí visible por la noche |
| Trivia breve integrada en acciones | Parcial: paradas de 3 opciones con fuente |
| Pichón y huevo con patitas | Parcial: criadero con patitas; falta «Save the Parrot» como reto repetible |

## Lo nuevo que vale la pena (orden propuesto, P0 primero)
1. **Árbol con frutos y «Banquete en la selva»:** frutos que aparecen, se recogen en vuelo, se llevan al nido o al refugio y suman puntos. Plantas de PR con fuente: palma de sierra y tabonuco. El guineo y la guayaba van como huerto, no como alimento silvestre.
2. **Clima de El Yunque:** sol, llovizna, aguacero y neblina con transiciones; la lluvia cambia la visibilidad y las corrientes. Que los FPS no caigan en el móvil.
3. **Fauna reactiva:** lagartijo en los troncos, mariposas y el coquí visible de noche, para observarlos y llevarlos al álbum. La boa sin demonizarla.
4. **«Save the Parrot»:** rescatar un pichón o proteger un nido, sin violencia. Reto repetible con resultado.
5. **Ríos vivos (P1):** 3 peces nativos (sirajo, dajao y guabina) que se observan con un visor o una cámara desde el vuelo, y se registran con fuente (USGS, DRNA). Las especies introducidas, solo con datos verificados por cuenca.

## Choques con reglas de Kelvin (no se aplican tal cual)
- **«Vuelo salvaje: carreras, anillos»:** Kelvin prohibió los anillos de vuelo. Los Retos usan banderines y flores.
- **«Usar ramas aisladas»:** la regla es una sola rama, `main`.
- **«Vittata no necesita bucear»:** el capítulo 1 ya tiene bucear (M1). Se puede añadir el visor sin quitar el buceo, pero lo decide Kelvin.
- **«Desafío del pescador» y colaboradores (Gongo Fishing, CJ Pesca):** decisión de Kelvin. Nada de nombres, marcas ni voces sin un acuerdo.
- **Datos científicos:** todo con fuente, URL y fecha de consulta; lo que no se verifique queda «por verificar».
