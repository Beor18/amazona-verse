# V18.1 · Tablero de resultados

Estados: NO INICIADO, EN DESARROLLO, DEMOSTRABLE, VERIFICADO, BLOQUEADO, FUERA DE ALCANCE. VERIFICADO exige prueba reproducible; DEMOSTRABLE exige juego ejecutable. Día 1 = 5-nov-2026.

| Función | Frente | Estado | Rama/commit | Demo/video real | Prueba | Próxima fecha | Bloqueo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Progreso compartido y bandera `?v18=1` | D | VERIFICADO | main · df205906 (+ `otorgado()` en D14) | `?v18=1` | `AV.v18Test()` 6/6 | — | — |
| Poderes (2 especies) | A | VERIFICADO | main · 43edae65 | `?v18=1`, duelo de la explanada | `AV.v18CombateTest()` 32/32; en el ciclo el duelo usa el Escudo de plumas de la especie elegida (`AV.v18CicloTest()`) | — | Efectos finales: KIMI (G.v18fx) |
| Combate IA | A | VERIFICADO | main · 43edae65; aviso «¡Bloqueado!» que se quedaba fijo, corregido en D14 | `?v18=1`, hablar con la Campeona | `AV.v18CombateTest()` 32/32; `AV.v18CicloTest()` (gana el duelo jugando, el aviso se borra solo) | — | — |
| Desbloqueo persistente | C | VERIFICADO | main · d7168e28 | `?v18=1`, cotorra que canta al oeste de Villa Raíz | `AV.v18DescubrirTest()` 21/21; tarjeta con los poderes reales (D14) | — | — |
| Reparación persistente | B | VERIFICADO | main · 70fba288 | `?v18=1`, cabecera del puente colgante | `AV.v18RepararTest()` 17/17 | — | — |
| Recompensa conectada | A/B/D | VERIFICADO | main · c9146761 | `?v18=1`: ganar → bandera verde al puente → reparar → pista del reto extra | `AV.v18CicloTest()` 22/22: ciclo entero, recarga, sin pago doble, 0 errores | D14 (18-nov) | — |
| Ciclo dentro del mapa | A/B/C/D | DEMOSTRABLE | main · c9146761 | `?v18=1` (falta video real en móvil) | `AV.v18CicloTest()` 22/22 | D21 (25-nov) | Falta grabarlo en iPhone/iPad y la ronda con Kelvin |
| Demo completa | D | NO INICIADO | — | — | — | D30 (4-dic) | — |
| PvP local (opcional) | A/D | NO INICIADO | — | — | — | Evaluar D21 | — |
| PvP online (posterior) | D | FUERA DE ALCANCE | — | — | — | Roadmap | — |

**D14 (frente D, 5-nov):** `src/game/v18/ciclo.js` conecta los módulos sin sistema de eventos nuevo: aviso de victoria con el uso de los materiales, bandera verde del minimapa hacia el puente, y tras repararlo la pista del segundo objetivo opcional (decisión 8): buscar la cotorra de Dominica si aún no la tienes, o ganar a la Campeona con la otra cotorra (se cumple una vez, sin premio nuevo). La prueba integral `AV.v18CicloTest()` recorre el ciclo entero con progreso limpio.
