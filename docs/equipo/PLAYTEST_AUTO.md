# Playtest automatizado · niño nuevo en móvil (CG-58)

4-nov. No sustituye el playtest con niños: lo prepara.

Cómo se jugó: iframe de 390×844, `?calidad=bajo`, toques simulados en el joystick y en los botones (Volar, Saltar, Bucear, Acción). Sin teleport y sin escribir el paso. Los capítulos 3 a 6 usan la tarjeta de su propio recorrido; el 1 y el 2 siguen solo la flecha. El tiempo es el del juego (no el reloj de pared). «Guía» es cuántas veces, tras 30 s sin avanzar, el niño abre la guía de controles.

## Resumen

| Cap. | ¿Llega al final? | Paso más largo | >30 s sin avanzar | Abre la guía |
|---|---|---|---|---|
| 1 | no (9/13) | 1 · Iguaca, 39,9 s | sí, en el paso 1 | 1 |
| 2 | el paso 1 sí (27,9 s); el capítulo no, en 120 acciones del paso 2 | 2 · las tarjetas, 365,3 s | no | 0 |
| 3 | sí (21/21) | 6 · la bahía, 60,7 s | no | 0 |
| 4 | sí (21/21) | 1 · la orilla, 22 s | no | 0 |
| 5 | sí (20/20) | 4 · la antena, 221,9 s | no | 0 |
| 6 | sí (21/21) | 5 · los dos grupos, 449,3 s | no | 0 |

Ningún paso dejó el objetivo vacío. Donde a pie no se llega, el niño prueba volando: eso no es un atasco de 30 s.

## Por capítulo y paso

### Capítulo 1

El objetivo del primer paso ya dice «Despega, vuela hasta Iguaca y pósate a su lado…». El niño llega al aire junto a Iguaca (`luma`), abre la guía una vez y, tras 6 intentos, el paso no avanza: no se queda posado. No reescribí la misión: el texto ya pide posarse.

| Paso | Juego (s) | Metros | Guía | Notas |
|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,5 | 0 | 0 | |
| 1 · Despega, vuela hasta Iguaca y pósate a su lado, en la copa del flamboyán de la plaza | 39,9 | 28 | 1 | a pie no llega; más de 30 s sin avanzar; 6 intentos en `luma` |

Medición otra vez el 10-nov, después del asiento inmediato (`f71173a9`, build `b676fee4`), con el mismo niño automático (390×844, toques, calidad baja, 6 intentos). Los 6 pasan al paso 2. La guía no se abre. Cada uno tarda 1222,3 s de juego, recorre 27 m y no marca un atasco de 30 s. El reloj de pared fue 171, 168, 168, 164, 171 y 169 s. Consola: 0 errores y 0 avisos. El asiento no acortó este recorrido: el tiempo de juego es el mismo que antes de sentarla.

### Capítulo 2

Medido otra vez el 4-nov sobre `04233d68` (incluye QA-148, `72fff7d5`), a 390×844, con toques y calidad baja. El paso 1 se cierra en 27,9 s y empieza el paso 2. No abre la guía. El cupo de 120 acciones se acaba en el paso 2 (`escuchar` sigue en falso): eso ya no es el atasco del paso 1. Playtest 3/4, 0 errores de consola.

| Paso | Juego (s) | Metros | Guía | Notas |
|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,7 | 0 | 0 | |
| 1 · Habla con Iguaca, lee los 3 sitios y cuéntale cuál elegiste | 27,9 | 105 | 0 | sale del paso |
| 2 · Enseña el plano, pregunta qué necesitan y ordena las tarjetas | 365,3 | 157 | 0 | el cupo de 120 acciones se acaba aquí |

### Capítulo 3

| Paso | Juego (s) | Metros | Guía | Notas |
|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,7 | 0 | 0 | |
| 1 · Habla con el papá, predice y prueba qué flota | 42,2 | 56 | 0 | |
| 2 · Arma el bote y bótalo | 3,4 | 5 | 0 | |
| 3 · Cambia lo que falló y bótalo otra vez | 3,8 | 0 | 0 | |
| 4 · Lee el agua con la navegante | 46,2 | 149 | 0 | |
| 5 · Practica en el río y decide quién lleva el timón | 14 | 53 | 0 | |
| 6 · Cruza la bahía y saluda en la otra orilla | 60,7 | 140 | 0 | a pie no llega: vuela |
| Extra · Seguir explorando e «Iguaca te pregunta» | 5,7 | 33 | 0 | |

### Capítulo 4

| Paso | Juego (s) | Metros | Guía | Notas |
|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,7 | 0 | 0 | |
| 1 · Habla con Iguaca, mira la orilla y cuéntale lo que viste | 22 | 83 | 0 | |
| 2 · Escucha las voces y mira la Balanza | 13,3 | 33 | 0 | |
| 3 · Prueba las 3 opciones en la maqueta | 2,3 | 0 | 0 | |
| 4 · Haz la asamblea y elige un cuidado | 1,9 | 0 | 0 | |
| 5 · Construye lo acordado | 3,6 | 12 | 0 | |
| 6 · Acompaña a la abuela en el primer cruce | 3,5 | 4 | 0 | |
| Extra · Seguir explorando e «Iguaca te pregunta» | 10 | 16 | 0 | |

### Capítulo 5

El paso 2 no abre fila: el índice pasa del 1 al 3 dentro de la misma acción.

| Paso | Juego (s) | Metros | Guía | Notas |
|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,7 | 0 | 0 | |
| 1 · Habla con Iguaca y separa las dos ondas | 9,1 | 7 | 0 | |
| 3 · Lee las ruinas y escucha al Guardián | 142,9 | 161 | 0 | a pie no llega: vuela, dos veces; el avance no se queda quieto 30 s |
| 4 · Endereza la antena y elige la señal | 221,9 | 55 | 0 | a pie no llega: vuela |
| 5 · Pon tres estaciones y prueba el relevo | 11,4 | 76 | 0 | |
| 6 · Pide ayuda y prueba hasta la niebla | 4,9 | 13 | 0 | |
| Extra · Seguir explorando e «Iguaca te pregunta» | 11 | 9 | 0 | |

### Capítulo 6

| Paso | Juego (s) | Metros | Guía | Notas |
|---|---|---|---|---|
| 0 · Portada, creador e inicio | 1,7 | 0 | 0 | |
| 1 · Recibe y conoce a los 6 visitantes | 21,4 | 27 | 0 | |
| 2 · Observa a dos y presenta las parejas | 17,7 | 28 | 0 | |
| 3 · Escribe el objetivo y arma el plan | 5,4 | 10 | 0 | |
| 4 · Levanta las tablas entre todos | 20,4 | 42 | 0 | |
| 5 · Escucha a los dos grupos e invita a los 8 que llegaron | 449,3 | 179 | 0 | a pie no llega: vuela; es el tramo más largo y sí termina |
| 6 · Habla con el Guardián en el centro | 4,3 | 18 | 0 | |
| Extra · Seguir explorando e «Iguaca te pregunta» | 4,4 | 26 | 0 | |

## Qué no se cambió del juego

Los capítulos 3 a 6 se terminan con toques. En el capítulo 1 el niño no sale del paso 1 (6 intentos en `luma`); no se tocó el juego. En el capítulo 2, QA-148 hace que el paso 1 se cierre y empiece el siguiente. No toqué `sitio/`, el carril de Kimi ni el modelo de Vittata.
