# HUEVOS_GDD · Criadero de cotorras

Estado: PROTOTIPO jugable (`index.html?criadero=1`). Dueño: game designer de huevos.
- Datos: `content/comun/huevos.js`.
- Código: `src/game/criadero.js` y `src/ui/criadero.css`.
- Traits: `docs/equipo/TRAITS_V2.md`. Bandera: `docs/BANDERA_PR_GUIA.md`.

## 1. Core loop y XP
**Aprendo y exploro → mi cotorra recibe calor y XP → nace y crece → cuido (cariño, poca XP) → gano cápsulas con retos de aprendizaje → vuelvo al juego.**

La XP llega por el evento `aprendizaje` que emiten aula, Diario y misiones. Cada `tipo:id` cuenta una sola vez, así que repetir no sirve.

| Fuente | XP | Grupo |
|---|---|---|
| Ficha de ciencia verificada | 40 | aprender |
| "Luma te pregunta" (intento 1, 2 o 3) | 20 / 15 / 10 | aprender: el esfuerzo siempre suma |
| Paso de la misión educativa | 15 | aprender |
| Lección de la liberación | 80 | aprender |
| Hallazgo del Diario | 25 | explorar |
| Misión | 60 | explorar |
| Cuidado | 5 | cuidar |

- **Curva:** XP acumulada para el nivel L = 5(L−1)² + 30(L−1). Nivel 6 = 275, nivel 16 = 1.575, nivel 20 = 2.375.
- **Peso:** el capítulo 1 da ≈1.100–1.400 XP; más del 85 % sale de aprender y explorar.
- **Cuidado sin castigo:**
  - Comida, agua, jugar y descansar gastan una carga. Hay como máximo 4, y cada 30 XP de aprender o explorar recargan una.
  - Sin cargas, el pichón sigue feliz y dice "aprende algo nuevo para tener más cuidados".
  - Ningún medidor baja con el tiempo real, y la mascota nunca enferma, pasa hambre ni muere.

## 2. Etapas y ritmo
| Etapa | Niveles | Nombre real | Cómo se ve |
|---|---|---|---|
| Huevo | — | huevo | Cápsula decorada con un huevo **blanco** dentro |
| Bebé | 1–5 | pichón | Vittata ×0,5, cabeza ×1,42, alas ×0,72, patas ×0,74, cola ×0,42, 4 capas de plumón |
| Juvenil | 6–15 | volantón | ×0,76, cabeza ×1,16, 2 capas de plumón corto |
| Adulto | 16–20 | adulto | **Vittata intacta** |

- **Incubación:** 26 "días" (4 XP = 1 día), que enseñan la duración real. La XP de la incubación no se pierde: el pichón nace en el nivel 3.
- **Ritmo:** depende de las acciones, no del reloj. Sirve una clase por semana; no hay rachas ni recompensas diarias. Una sesión de 45 min basta para ver nacer (≈110 XP); el capítulo 1 lleva al juvenil y el adulto llega rejugando o con el capítulo 2.
- **Una cría a la vez:** la siguiente cápsula se incuba cuando la actual es adulta.

**Mismo modelo (regla de Kelvin).** No hay personaje nuevo: todo se hace en tiempo de ejecución con la API pública de `AVCharacter`:
- `create()` y `ch.bones`: escala uniforme por hueso (`cabeza001`, `armL1`, `pieL1`, dedos, `espalda1001`) y `root.scale`; nunca los `mount_*` ni el `pico`.
- El factor se deshace antes de `ch.update(dt)` y se reaplica después (los clips traen pistas de escala), como `rot()`. El TA confirmó que `update()` no lee `bone.scale`.
- Los pies se bajan midiendo los dedos.
- Plumón: cascarones `SkinnedMesh` (*shell fur*) que comparten geometría y esqueleto, sin tapar ojos ni pico.
- Posturas con `ch.rot`, `play`, `gait`, `wingMode` y `expression`. No se toca `src/personaje/`.

## 3. Cápsulas: fantasía con capa real
Los huevos reales de *Amazona vittata* son blancos. Los temáticos son **cápsulas**: sus pétalos decorados se abren como una flor y dejan ver el huevo blanco de verdad. La narración lo dice en ese momento.

Eclosión, hecha con primitivas y shaders:
1. La cápsula tiembla y se abre.
2. El huevo se mueve y se agrieta (con Voronoi, en tres golpecitos).
3. Le salen patitas zigodáctilas, con 2 dedos adelante y 2 atrás, y pasea.
4. ¡Hatch!: la tapa sale volando y queda como **cascarón-gorro**.

La rareza es la dificultad del reto, nunca una probabilidad ni un precio:

| Cápsula | Reto | Cómo se gana (cap1 · otros packs) |
|---|---|---|
| De nido (clásica) | Inicial | Abrir el criadero |
| Tropical | Exploración | Misión del coro de coquíes · 200 XP de aprender |
| Playa | Exploración | Misión del fondo del río · 150 XP |
| Bosque | Diario | "La ruta de la gota" · 3 fichas |
| Boricua (PR) | Cultura | 4 hallazgos de cultura. Estrellas en la cáscara y **bandera fiel en asta** junto al nido |
| Espacial | Reto de preguntas | Responder las 7 preguntas de Luma (cualquier intento) |
| Dorada | Reto del Diario completo | Diario 12/12 y 3 misiones |
| Cristal | Reto de conservación | Criar una cotorra hasta adulta y completar la lección de la liberación |

## 4. Traits únicos por cápsula y etapa
- **Cada etapa suma piezas** y la de mayor etapa gana su ranura. Ejemplo tropical: pañuelo caribe (bebé), sombrero tropical (juvenil), hawaiana con chancletas (adulto).
- **Únicos del criadero:**
  - **Bebé:** plumón y cascarón-gorro blanco, tomado de su propio huevo.
  - **Adulto:** **anillo de anillamiento científico** en la pata, con el color de su cápsula.
  - **Por cápsula:** binoculares (bosque), casco espacial, lupa (dorada) y cristal colgante.
- **Piezas nuevas:** usan una pieza `respaldo` hasta que exista su modelo (ver TRAITS_V2).
- **Bandera:** las piezas con la bandera nunca se venden; la de la cápsula boricua va en asta junto al nido en todas las etapas.

## 5. Posturas y animaciones del bebé
- **Las seis de la lámina** (sentado, caminando, saltando, aleteando, durmiendo y jugando) más dos de cuidado (comiendo y bebiendo).
- **Cómo se arman:** sobre los clips del rig (Idle, Walk y Celebrate), con `rot()` en patas, cabeza y espalda, `wingMode: 'flap'` y el pop elástico al nacer.
- **Comportamiento:**
  - El bebé cambia de postura solo cada ~5 s.
  - Tocarlo hace que salte o aletee.
  - Al cambiar de etapa da una vuelta con chispas.
- **Postura extra:** el adulto puede ir a "volando" (liberación y video del pitch).
- **Movimiento reducido:** la eclosión dura la mitad y no hay temblores.

## 6. Encaje con el capítulo 1 y los futuros
- **Capítulo 1:** las cápsulas premian las misiones existentes (m1, educativa y m3) y los hitos del Diario, sin tocar el guion. Al terminar la primera misión aparece un nido junto a la Estación de Conservación y el botón «Nido» del HUD; Luma lo presenta una vez.
- **Compañero:** la cría nacida sigue a Vittata en el mundo (`companero()` y `vestir()` aquí; seguimiento en actores.js).
- **Capítulos futuros:**
  - Comparten el criadero (`<almacen>.criadero`), porque la clave es del juego y no del pack.
  - Cada pack mapea sus retos con `obtener.<pack>`.
  - Ideas:
    - Capítulo 2 en El Yunque: la cápsula espacial pasa a un reto de astronomía.
    - Las adultas liberadas aparecen como bandada silvestre en el mapa.
    - Las 34 especies de *Amazona* llegan como fichas.
- **La capa real va por momentos:** aviarios de Iguaca (USFWS) y José Vivaldi (DRNA), pichones atendidos, cavidades naturales, liberaciones desde 2020, Maricao (2022), más de 900 cotorras y María. Solo se publica lo verificado (USFWS 2026). Huevo blanco, 2–4 huevos, 24–28 días, aclimatación y radiotransmisores quedan **parciales**: no salen como ficha hasta tener la cita del DRNA o el USFWS.

## 7. Modo Maestro
Es la pestaña **Criadero** de `G.aula.pestana`, detrás de la misma suma del menú de pausa, sin puerta duplicada. Muestra:
- XP por grupo (aprender, explorar, cuidar) con su porcentaje.
- Cada cápsula con su etapa, nivel o días, y cómo se gana.
- La capa real con su estado, fuente y URL. Las URL solo aparecen aquí.
- Abrir el criadero, **demostración: siguiente etapa** para enseñar las cuatro en clase, y borrar el criadero del dispositivo.

Todo se guarda en `localStorage`, sin nombres, texto libre ni red (COPPA).

**Por hacer:** una columna en el reporte CSV y una actividad sin pantalla, "Incubadora de la clase", con un calendario de 26 días y un huevo blanco de papel.

## 8. Riesgos
| Riesgo | Mitigación |
|---|---|
| Que la mascota distraiga de la lección | XP casi solo por aprender; cuidar limitado por cargas |
| Ansiedad o culpa | Sin decaimiento, muerte, enfermedad, rachas ni notificaciones |
| Que parezca loot box | Sin azar ni precio; la prueba lo verifica. Cápsulas nunca en la tienda |
| Inexactitud científica | Fantasía separada del huevo blanco real; fichas parciales sin publicar; validar con el DRNA |
| Bandera mal hecha o uso legal (Reglamento 5282) | Guía obligatoria; bandera solo en asta o en la mano; abogado antes de vender algo con la bandera |
| Rendimiento en tabletas escolares | Un modelo, 4 cascarones, sombras de 1024, DPR ≤ 2; probar en dispositivos reales |
| Adulto lejano en un solo capítulo | Demostración docente y continuidad entre capítulos |
