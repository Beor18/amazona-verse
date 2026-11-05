# V18.1 · Textos de la demo: propuesta para Kelvin

**Estado: propuesta, no aplicada.** Revisión de los avisos de `src/game/v18/descubrir.js`, `combate.js` y `reparar.js` (5-nov). Lo que se busca: que suenen a niños de Puerto Rico, cortos y alegres. Si se aprueba un cambio, también hay que cambiar su línea en `content/cap1/en.js`, porque la traducción va por el texto exacto.

**En general están bien:** son cortos, no regañan y el humor funciona («¡Uy, te mareaste! Sacude las plumas…»). Los cambios son de tono y de largo.

| # | Dónde | Hoy | Propuesta | Por qué |
|---|---|---|---|---|
| 1 | descubrir.js:29 | Descubriste una cotorra de Dominica. Acércate y pulsa Acción para seguirla. | ¡Wepa! Una cotorra de Dominica. Acércate y dale a Acción para seguirla. | «Dale» es más de aquí que «pulsa»; «¡Wepa!» da alegría |
| 2 | descubrir.js:31 | ¡Síguela volando de copa en copa! Tienes 50 segundos. | ¡Síguela de copa en copa! Tienes 50 segundos. | Más corto |
| 3 | descubrir.js:34 | Se fue a su rama a descansar. Pulsa Acción junto a ella para intentarlo otra vez. | Se cansó y se fue a su rama. Dale a Acción a su lado y vuelve a intentarlo. | «Pulsa» → «dale» |
| 4 | descubrir.js:36 | ¡La cotorra de Dominica ya vuela contigo! Elígela para el duelo en el menú de pausa (Mis cotorras). | ¡La cotorra de Dominica ya es de tu bandada! Búscala en Pausa → Mis cotorras. | Más corto; «bandada» es el lenguaje del juego |
| 5 | descubrir.js:38 | Solo cambia el poder del duelo. Tu personaje se queda igual. | Cambia tu poder en el duelo. Tú sigues siendo tú. | Más alegre |
| 6 | combate.js:30 | Ala: Acción · Semilla: Impulso · Poder: mantén Impulso o G | Táctil: «Toca Ala, Semilla o Poder». Teclado: igual que hoy | QA-163: en el teléfono no hay G |
| 7 | combate.js:31 | ¡Ganaste otra vez! Los materiales de este duelo ya te los llevaste. | ¡Otra vez campeona! Los materiales ya te los llevaste; busca más por el bosque. | Dice dónde seguir |
| 8 | combate.js:34 | Duelo de entrenamiento: quítale sus 5 plumas. | ¡A jugar! Quítale sus 5 plumas a la Campeona. | «Entrenamiento» suena a clase |
| 9 | reparar.js:114 | Para reparar el puente necesitas 2 maderas y 1 piedra (tienes X y Y). Gana el duelo de la explanada o junta madera y piedra por el bosque. | Faltan materiales: 2 maderas y 1 piedra (tienes X y Y). Gánalas en el duelo o búscalas por el bosque. | Es el aviso más largo (5 s); así se lee de un vistazo |
| 10 | reparar.js:127 | ¡Puente reparado! Ya se cruza a pie, y en el centro sube una corriente de aire. | ¡Puente arreglado! Crúzalo a pie o vuela al centro: ¡hay una corriente que te sube! | «Arreglado» es más de casa |

**Para Kelvin:** contesta con los números que apruebas, por ejemplo «1, 3, 6 sí; 4 no». Lo aprobado lo aplica el dueño de cada archivo (combate, descubrir, reparar), junto con su inglés.
