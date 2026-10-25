# Movimiento y animación de Vittata

Dueño: rol Movimiento y animación. Archivos: `src/engine/fisica.js`, `input.js`, `camara.js`, `actores.js`, `agarre.js`, `src/pruebas/movimiento.js` y la capa procedural de `src/personaje/character.js`. El modelo y el rig no se tocan.

Prueba: `AV.movementTest()` da 22 de 22, con las métricas en `.metricas`. `selfTest`, `missionTest`, `accessoryTest` y `templateTest` siguen pasando.

## 1. Playtest: problemas encontrados y prioridad

Medido con la simulación real (`fisica.step` a 60 Hz) y con capturas (`docs/img/mov_*.png`).

| Prio | Problema | Medida antes | Estado |
|---|---|---|---|
| P0 | Volar no se sostenía. V o Volar en el suelo daba un saltito de 0,94 m y aterrizaba solo a los 1,5 s, porque sin tocar nada bajaba a 1,1 m/s. No había cernido. | 0,94 m, 1,5 s | Resuelto: despega unos 4 m y se queda cernida (deriva de 0,15 m en 2 s). |
| P0 | Dejar de volar era caer en picada. V en el aire apagaba el vuelo y caía con gravedad. En táctil no había un control claro. | 16,6 m → impacto a −27 m/s | Resuelto: V o el botón ("Aterrizar") baja a 5,5 m/s y frena con las alas: toca a −2 m/s. Saltar o V otra vez sigue volando. |
| P0 | Volar hasta el agua la metía bajo el agua, hasta el fondo. Volar desde el agua volaba sumergida. | −5,4 m | Resuelto: tocar el agua honda volando pasa a nadar con salpicadura. Despega desde el agua. |
| P0 | Bajar una cuesta corriendo la despegaba del suelo: aleteaba y recogía las patas en cada bajada. | 58 de 60 cuadros en el aire | Resuelto: se pega al suelo (100 % de los cuadros en una ladera de 30°). |
| P0 | Subía riscos de 59° a toda velocidad y no frenaba cuesta arriba. | 8,8 m/s en 34° | Resuelto: más de 48° no se sube (resbala por la curva de nivel). Cuesta arriba frena a ~76 % en 34°. |
| P1 | Sin búfer de salto: pulsar justo antes de aterrizar gastaba el doble salto, y el tercer toque despegaba sin querer. | — | Resuelto: búfer de 0,13 s. |
| P1 | El salto no dependía de cuánto se pulsaba (1,22 m siempre) y caía flotando. | — | Resuelto: un toque da 0,71 m y mantener, 1,22 m. Cae más firme. |
| P1 | El pico no iba con el texto: se movía 600 ms + 55 ms por letra, pero la máquina escribe a 45 letras/s. Seguía hablando ~2 s después de terminar y no hacía caso a la voz. | — | Resuelto: sílabas del texto que se escribe o de la voz, máx. 9 por segundo, y se cierra al acabar. |
| P1 | No había agarrar ni llevar. | — | Nuevo: `agarre.js` (pico, mano, brazos y patas en vuelo) con pose de carga por IK. |
| P1 | Volar no parecía volar: sin ladeo en las curvas, alas iguales en todo y sin despegue ni aterrizaje. Con rotación XYZ, de lado la inclinación tumbaba el cuerpo de costado. | — | Resuelto: rotación YXZ, ladeo en las curvas, alas por modo y cabeza nivelada. |
| P1 | Los pies patinaban: el paso iba a 3,4 Hz fijos a cualquier velocidad, encima del clip Walk a 1 Hz. | 1,9 m por ciclo | Resuelto: la cadencia sale de la velocidad, el clip va en fase y correr es a saltitos con aleteo. |
| P1 | Sin IK de patas: en una ladera un pie flotaba y el otro se hundía. | 0,21 m flotando | Mejorado: 0,06 m. |
| P1 | Cámara: subía y bajaba con cada salto y no se ponía detrás. | — | Resuelto: altura estable al saltar y seguimiento perezoso. |
| P2 | Al escuchar a un NPC no lo miraba, y al recoger algo no reaccionaba. | — | Resuelto: mira a quien habla y da un saltito feliz al recoger. |
| P2 | Bandera de mano casi horizontal con los brazos abajo. Lo pidió el TA. | — | Resuelto: el asta queda vertical en cualquier pose. |
| P2 | Tras un teleport largo, Vittata podía quedar oculta por el culling de objetos pequeños. | — | Resuelto: el jugador y el compañero quedan fuera del culling. |
| P2 | El mar de la plantilla (fuera del modo mapa) no se puede nadar: es solo visual. | — | Avisado al programador gráfico. |
| P2 | Una captura fuera del bucle dibuja los huesos del cuadro anterior (`info.autoReset = false` en renderer.js). | — | Resuelto por el programador gráfico (a5a72ac). |

## 2. Métricas (AV.movementTest)

| Medida | Antes | Ahora |
|---|---|---|
| Latencia de entrada | 1 cuadro | 1 cuadro |
| Arranque al 90 % | 167 ms | 133 ms |
| Frenado al 10 % | 133 ms | 117 ms (0,16 m) |
| Giro de 180° | — | 133 ms |
| Salto: completo / un toque / doble | 1,22 / 1,22 / 2,21 m | 1,22 / 0,71 / 2,27 m |
| Vuelo: crucero / radio de giro | 12 m/s / — | 12 m/s / 2,1 m |
| Aterrizar desde 8,9 m | −27 m/s (caída) | 2,1 s, −2 m/s |
| Cuesta abajo en el suelo | 3 % | 100 % |
| Pico al hablar | sin sincronía | ~5 sílabas por segundo, cerrado al terminar |

## 3. Controles

- **Teclado:** WASD/flechas para moverse, Shift para correr y Espacio para saltar. Un toque da un salto corto y mantener, uno largo. En el aire, Espacio otra vez hace el doble salto y, si se mantiene, planea; la tercera vez despega. **V** despega y, volando, **V aterriza**. Volando, Espacio sube y C baja; sin tocar nada se queda cernida. F da un impulso y E sirve para Acción, recoger y soltar.
- **Táctil:** el botón **Volar** cambia a **Aterrizar** mientras vuela. Saltar sube y Acción recoge y suelta.

## 4. Ajuste fino (para forks)

- **Física:** `G.fisica.TUNING`, en `fisica.js` y documentado línea a línea. Un pack lo cambia con `jugador.fisica = { walk, jumpV, fly, landV, … }`.
- **Cámara:** `G.camara.CAM`; el pack usa `jugador.camaraAjuste`.
- **Animación:** `ANIM` en `character.js` (zancada, cadencias, alas por modo, apertura del pico, giro de cabeza e IK).
- **Agarre:** `G.agarre.AG` (tiempos y tamaños por enganche).
- **Boca:** `MOUTH` en `actores.js` (sílabas por segundo y letras por segundo de la voz).

## 5. Interfaces con otros roles

- **Gameplay** decide qué se agarra: `G.agarre.agarrar(obj, { id, enganche })`, `soltar({ en })`, `usar()` y `lleva()`, con los ganchos `agarrado`, `soltado` y `usado`. Acción suelta lo que se lleva (interaccion.js, d978bd0). Opcional: `G.emit('voz', { charIndex })` para que el pico siga la voz palabra a palabra.
- **Perchas:** `addPercha`, `suelo` y la regla de "posado" no cambian.
- **Criadero:** el compañero es la cría nacida. criadero.js da `companero()`, `vestir(ch, info)` y el evento `companero`; actores.js la sigue. El bebé va a saltitos a 1,2 m y no vuela; el juvenil camina a 1,6 m; el adulto, a 1,9 m, vuela junto a Vittata. Si se queda a más de 25 m, reaparece detrás. Sin cría nacida no hay compañero; sin criadero en el pack, sigue el aprendiz (`docs/img/mov_companero.png`).

## 6. Pendiente

- El IK de patas deja ~7 cm de error en el pie de arriba en laderas de más de 20°. Se puede afinar con más iteraciones o con una inclinación del tobillo según la normal.
- Un gesto de "posarse" propio en las perchas y en el nido (ahora usa el aterrizaje general).
