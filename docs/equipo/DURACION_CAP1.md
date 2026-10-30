# Duración del capítulo 1 (AP4, hito 26)

Medido por `tests/qa/duracion_cap1.js` sobre el recorrido completo de `tests/qa/e2e.js` (rama B, 45/45 comprobaciones). Corrida en la nube (SwiftShader, sin GPU) sobre el main real a6bc41e con AP1–AP2.

| Jugador | Duración | Cómo se calcula |
|---|---|---|
| Rápido | **5 min 28 s** | juego simulado 2 min 25 s + trayectos 2 min 16 s (893 m a pie, 612 m en vuelo) + 19 líneas y 40 clics a 0,8 s, sin leer |
| Normal | **6 min 37 s** | lo mismo leyendo los diálogos a 15 caracteres por segundo (1268 caracteres) |
| Explorador | **10 min 39 s** | normal + 13 hallazgos del Diario que el recorrido no recogió: 1389 m de vuelo, su ficha a 15 car/s y 3 s para mirar cada uno |

**Aula:** `minutos_mision` de la partida del recorrido = 2 min (reloj de la misión educativa, en tiempo real de la prueba, que va con atajos: no es la duración de un niño).

**Límites:** son cotas inferiores. La prueba se teletransporta en vez de buscar el camino, no se equivoca y no cuenta el texto de las tarjetas ni los bocadillos libres (salen mientras se juega). Las metas del GDD (10–15 min), GAMEPLAY (20–30 min) y EDUCATIVO (45 min de clase) solo se validan con jugadores reales.

Fases (rápido): Inicio 0 s · Iguaca 10 s · Taller 3 s · Recolección y M1 26 s · La ruta de la gota 185 s · Construir y crecida 51 s · Guardián 2 s · Transmisor y coquíes 39 s · Mirador y final 12 s

**Cómo repetirla:** servir el juego y `node tests/qa/duracion_cap1_correr.js http://127.0.0.1:<puerto>/ docs/equipo/DURACION_CAP1.md` (sin GPU, con `AV_SWIFTSHADER=1`). Con GPU las cifras son las mismas: el modelo cuenta el tiempo del juego, no el de la máquina.
