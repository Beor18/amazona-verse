# AMAZONA VERSE — V18.1 · NUEVO MINIJUEGO: AMAZONA MINI GOLF
## La Ruta de las Semillas
(Kelvin, 5-nov-2026. Copia guardada por la coordinadora web. **Estado:** propuesta aprobada para prototipo. **Prioridad:** complementaria a V18.1; no debe retrasar el combate, los poderes, las amenazas ni los seis capítulos.)

## 1. Visión
Minijuego de golf **dentro de las ciudades y escenarios que ya existen**: no hay otro mundo, ni mapa independiente, ni experiencia desconectada. El jugador explora una ciudad, encuentra una zona de minigolf, juega el desafío y sigue su aventura. Tiene que ser divertido y fácil de aprender, apto para niños y familias, jugable en computadora y móvil, visualmente atractivo, repetible y competitivo, integrado en el mundo, compatible con los poderes de las cotorras, ligero y hecho reutilizando sistemas actuales. No es un simulador complicado de golf.

## 2. Mecánica principal
En vez de palo, la cotorra impulsa una **semilla gigante** hacia un **nido**. Pasos:
1. Encontrar la estación en la ciudad.
2. Acercarse y activar el desafío.
3. Observar el recorrido.
4. Elegir la dirección.
5. Ajustar la potencia.
6. Impulsar la semilla.
7. Usar un poder especial con estrategia.
8. Meterla en el nido con los menos golpes posibles.

Cada intento es un golpe y la partida termina al llegar al nido. Hay opción de reinicio y forma sencilla de abandonar.

## 3. Integración en las ciudades
Antes de programar, inspeccionar mapas, escenarios y sistemas.
- **A. Ciudad de los 36:** candidata principal para el primer circuito urbano. Plaza, jardín o espacio abierto con la geometría existente: caminos curvos, jardineras, árboles, rampas, muros bajos, puentes, decoración. No modificar edificios importantes ni bloquear caminos principales.
- **B. Villa Raíz:** recorrido de iniciación para aprender a apuntar, medir la potencia y controlar la semilla.
- **C. Puerto de La Mina:** desafíos avanzados (rampas, plataformas, desniveles, bordes de muelle, obstáculos junto al agua), si es técnicamente adecuado.
- **D. Otras zonas:** después del prototipo.

Son candidatas, no superficies ya aptas: Claude verifica el código y la geometría antes de decidir.

## 4. Poderes (sistema V18.1; no crear otro sistema de habilidades)
- **PICO, ondas sonoras** (Vittata, Grito del Yunque): empuje extra, corregir trayectoria, superar una rampa, alcanzar un objetivo lejano. Con dirección, fuerza y límites.
- **ALAS, corrientes de aire:** desviar, ayudar a superar obstáculos, ajustes laterales.
- **OJOS, visión especial:** trayectoria aproximada, rebotes, camino alternativo, obstáculos ocultos. No una trayectoria perfecta.
- **PLUMAS, protección:** barrera temporal (no caer al agua, frenar, rebote controlado).

**Equilibrio:** como máximo un uso de poder por hoyo. El primer prototipo solo necesita el poder de Vittata.

## 5. Primer prototipo obligatorio: un hoyo completo en una ciudad existente
Debe tener:
1. Zona de activación.
2. Semilla visible.
3. Nido.
4. Apuntado.
5. Potencia.
6. Física de la semilla.
7. Colisiones con terreno y obstáculos.
8. Contador de golpes.
9. Victoria.
10. Reinicio.
11. Abandonar.
12. Grito del Yunque aplicado a la semilla.
13. Récord local.
14. Controles en móvil y computadora.

El jugador entra, completa, recibe su resultado y sigue explorando. **No está terminado** si la semilla atraviesa objetos, se queda atrapada a menudo o el nido no registra la llegada.

## 6. Controles
- **Computadora:** ratón o controles existentes para apuntar, indicador de potencia, acción sencilla para golpear, poder, reinicio y salida.
- **Móvil:** táctil, deslizar o ajustar la dirección, potencia fácil, botones grandes, cámara que muestre semilla y recorrido. Sin precisión excesiva.

Funciona en móvil sin perjudicar la experiencia ya validada.

## 7. Física y colisiones
Primero las herramientas del juego; ninguna biblioteca nueva sin justificar.

La semilla tiene:
- movimiento consistente;
- fricción;
- rebotes controlados;
- colisiones estables;
- límite de velocidad;
- detección de reposo;
- reinicio si sale del área.

Que no dependa de los FPS. Se permiten superficies de colisión simplificadas que respeten lo visual. No alterar el mundo principal por problemas del minigolf.

## 8. Cámara
Transición suave para mostrar el recorrido, seguimiento claro de la semilla y vuelta a la aventura al terminar. Es una actividad dentro de la ciudad. Sin movimientos bruscos en el móvil.

## 9. Puntuación y recompensas
- Por hoyo: golpes, par, mejor resultado personal y medalla.
- Medallas provisionales: **oro** = par o mejor; **plata** = par +1; **bronce** = completar.
- Recompensas: materiales o cosméticos que ya existan, sin romper la economía.
- **Sin monedas nuevas, tiendas ni pagos.** Resultados guardados localmente.
- **Sin rankings públicos ni identificadores de menores.**

## 10. Expansión a seis hoyos (solo después de validar el primero)
| Hoyo | Zona candidata | Mecánica |
|---|---|---|
| 1 | Villa Raíz | Apuntado y potencia |
| 2 | Ciudad de los 36 | Rebotes y obstáculos urbanos |
| 3 | Puerto de La Mina | Rampas y desniveles |
| 4 | Zona de río existente | Precisión cerca del agua |
| 5 | Zona nocturna existente | Obstáculos y visibilidad |
| 6 | Ciudad de los 36 | Circuito final con poderes |

La distribución depende de los mapas reales. No construir espacios nuevos innecesarios ni interferir con misiones, escenas o personajes.

## 11. Progresión
Explorar → descubrir el desafío → jugar → mejorar el récord → recompensa → seguir la aventura. Algunos circuitos se desbloquean por capítulo o zona. Nunca es obligatorio para la historia; es opcional, divertido y repetible.

## 12. Multijugador futuro
Primero, 2 jugadores por turnos en el mismo aparato, sin chat, cuentas ni servidores. Online fuera de alcance.

## 13. Integración técnica
Revisar primero:
- los capítulos;
- la Ciudad de los 36, Villa Raíz y La Mina;
- colisiones;
- movimiento y cámara;
- controles móviles;
- habilidades V18.1;
- récords locales;
- el menú Retos;
- el rendimiento.

Reutilizar lo que se pueda, en un módulo aislado y con banderas. No tocar modelos ni rigs de las cotorras.

## 14. Plan
1. Inspección: ubicación real y sistemas reutilizables, con una recomendación breve.
2. Prototipo de un hoyo.
3. Grito del Yunque.
4. Integración: activación, retorno, récord y móvil.
5. Pruebas: jugabilidad, física, colisiones, rendimiento móvil, guardado, capítulos y regresiones.
6. Expansión, solo si el primer hoyo es divertido y estable.

## 15. Entregables del prototipo
1. Ubicación exacta.
2. Enlace jugable de prueba.
3. Video real de una partida completa.
4. Commit.
5. Pruebas.
6. Confirmación en el móvil.
7. Problemas conocidos.
8. Estimación para los 6 hoyos.

Una imagen conceptual no es prueba.

## 16. Reglas que no se rompen
- No reescribir capítulos.
- No cambiar el canon.
- No tocar el rig de Vittata.
- No eliminar especies.
- No retrasar V18.1.
- Nada online que comprometa la privacidad infantil.
- Sin gastos ni dependencias innecesarias.
- No construir 6 circuitos antes de validar uno.
- No dar nada por terminado sin pruebas.

**Objetivo final:** que se sienta como algo que siempre perteneció a Amazona Verse. **Primera misión: un hoyo excelente, dentro de una ciudad existente, completamente jugable en móvil y computadora.**
