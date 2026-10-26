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

## Estado del punto 1, «Banquete en la selva» (25-oct-2026, Fable)
Código en `src/game/banquete.js` (carga perezosa; prueba `AV.banqueteTest`, 43 comprobaciones). Capturas en `docs/img/banquete_*.png`.
| Pieza | Estado | Dónde |
|---|---|---|
| Árboles con frutos: racimos en las palmas de sierra y frutos en los tabonucos reales del mapa (60 árboles en alto, 36 en medio, 16 en bajo), con brillo, instanciados | **EXISTE** | `banquete.js` (`poblar`, `capa`) |
| Recoger en vuelo al pasar (sonido, chispas), llevar hasta 5 al nido o al refugio: saltitos del pichón y +5 XP por fruto por la API del criadero | **EXISTE** | `banquete.js` (`recogerMundo`, `entregar`), `criadero.js` (fuente `fruta`) |
| Comer del árbol (P1 de Kelvin): rama (percha) por árbol, posarse, botón «Comer», gesto Celebrate del rig de Vittata, +5 XP al nido, HUD «+5 XP al nido», el fruto vuelve a los 2–3 min | **EXISTE** | `banquete.js` (`comer`, `percharArbol`) |
| Energía o salud del pichón al comer | **PENDIENTE** (decisión de Kelvin): hoy no hay sistema de energía; se eligió XP al nido, sin castigos | — |
| Detectar el árbol con fruta desde lejos (brújula o brillo a distancia) | **PARCIAL**: los frutos brillan, pero no hay indicador en el HUD ni en el mapa | — |
| Minijuego «¡Banquete!» (75 s, combos sin tocar el suelo, ruta de abajo 10 y copas 25, pista graciosa al tocar el suelo, récord y «Mis récords») | **EXISTE** | `banquete.js` (`MODO`), `retos.js` (entrada), `records.js` (tarjeta) |
| Dato real con fuente (USFWS, ficha de *Amazona vittata*) al comer o recoger la primera palma | **EXISTE** (la ficha `cotorra_alimento` de `lecciones.js` sigue «por verificar»: la URL de arriba sirve para cerrarla, carril de contenido) | `banquete.js` (`DATO`) |
| Huerto de guayaba y guineo junto a las casas | **PENDIENTE** (opcional; modelos nuevos) | — |

## Choques con reglas de Kelvin (no se aplican tal cual)
- **«Vuelo salvaje: carreras, anillos»:** Kelvin prohibió los anillos de vuelo. Los Retos usan banderines y flores.
- **«Usar ramas aisladas»:** la regla es una sola rama, `main`.
- **«Vittata no necesita bucear»:** el capítulo 1 ya tiene bucear (M1). Se puede añadir el visor sin quitar el buceo, pero lo decide Kelvin.
- **«Desafío del pescador» y colaboradores (Gongo Fishing, CJ Pesca):** decisión de Kelvin. Nada de nombres, marcas ni voces sin un acuerdo.
- **Datos científicos:** todo con fuente, URL y fecha de consulta; lo que no se verifique queda «por verificar».
