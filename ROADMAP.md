# Amazona Verse: roadmap y pendientes

Actualizado el **6 de noviembre de 2026**. Detalle vivo en `docs/equipo/COORDINACION_VIVO.md`, la tabla «Estado» de `docs/equipo/TAREAS_API.md`,
`docs/equipo/CAP1_PENDIENTE.md`, `docs/equipo/BUGS.md`, `docs/equipo/ESTADO_REAL.md`, `docs/equipo/V18_TABLERO.md` y `docs/DECISION_LOG.md`. Publica la nube (`tools/build/publicar_nube.sh`) o la Mac (`publicar_mac.sh`), siempre con las 12 baterías obligatorias en verde; este documento no
dice qué versión está en línea (míralo en la hoja viva).

## Dónde estamos (6-nov)
Cada punto lleva el commit que lo prueba.
- **Capítulo 1 al 100 %.** Jugable de principio a fin; sobrinos de Kelvin lo terminaron en 16 min. Solo quedan decisiones de Kelvin (`docs/equipo/CAP1_PENDIENTE.md`, `PENDIENTES_KELVIN.md`).
- **Toda la temporada en un solo mapa.** Los 6 capítulos se juegan en el mapa real del cap. 1, una zona por capítulo (`src/game/zonas.js`): caps. 2 a 4 (BM111–BM113) y caps. 5 y 6 encendidos por Kelvin el 3-nov (`cf88e2ab`; `?mapa=pequeno` vuelve al mundo pequeño para pruebas). QA visual con GPU de los caps. 5 y 6: `07300c5c`.
- **Mundo V18.1 (demo con `?v18=1`).** Ciclo completo jugable (duelo con la Campeona, reparación del puente, Sombra de Tormenta, cotorras y poderes nuevos); minigolf «La Ruta de las Semillas», hoyo 1 en Villa Raíz, a solas o por turnos (`2acad2d8`, `9d488aec`); Serpiente Emplumada y Sapo Cantor desbloqueables (`25c9ca65`). Detalle vivo en `docs/equipo/V18_TABLERO.md`. **V18.2 (evolución de Vittata)** aprobada el 6-nov (`9139b6c4`, `9c3372f5`) con prototipo ya en main (`088689ca`); **V18.3 (puerto)** en desarrollo (`fa5ce523`).
- **36 especies con piel** (37 pieles con la de Vittata): agilis, albifrons y festiva (BM124, `bfbb9378`), finschi, lilacina, vinacea y autumnalis (`7c552a1d`) y las extintas Mara y Vela (`a188c4e9`). Cada piel con sus fuentes en `docs/equipo/pieles_fuentes/`.
- **Diario de los caps. 2 a 6:** las fichas de Ciencia se ganan jugando (`8684a696`).
- **Mundo vivo, etapa 1:** cotorras residentes en 5 lugares, la bandada viaja y se posa, y el Álbum de las 36 en el Diario (`1b710e3b`); bandada de la casa, local y sin red (CG-18, `9095e5a2`).
- **Dones:** seis dones por familia; Iguaca enseña la Llamada de la bandada (CG-16, `e88d59ba`); faltan las mentoras Lilacina y Oratrix (CG-19). Retos «Con dones» opcional y fuera del ranking (CG-17).
- **Secretos:** 5 en el cap. 1 (CG-12, `13e91e10`) y 4 o 5 en cada cap. 2 a 6 (CG-13/CG-14, `97c955b9`); todo en inglés también (W7, `f07a8829`).
- **El cap. 5 de noche:** luna fría y baja, faroles, cucubanos, estrellas y nubes (`850bc1f3`, `67f18e79`).
- **Rendimiento:** ruinas a 150 draw calls (KIMI-Task-001, `b5bf103`) y texturas de edificios de 322 a 81 MiB (KIMI-Task-002, `8586f72`).
- **Pruebas:** 12 baterías obligatorias en verde en cada publicación (`docs/TEST_REPORT.md`).

## Carriles (no se pisan)
| Carril | Quién | Qué |
|---|---|---|
| 3D: edificios, ciudad, terreno y mapa | Kimi y Fernando | `docs/equipo/TAREAS_KIMI.md` (KIMI-Task-001 a 010). Nadie más toca lo gráfico del mundo. |
| Contenido, historia, inglés, accesibilidad, web, documentos | Agente web | `docs/equipo/TAREAS_WEB.md` (W1 a W12). |
| GitHub, integración, hoja viva, flora translúcida (B1) y objetos de la historia (hito 28) | Coordinadora (nube) | Revisa e integra lo de todos. |
| GPU real, Blender y publicación | Mac | Cola BM116, BM119, BM121, BM127, BM128; publica `sitio/` solo con las 12 baterías obligatorias en verde. |
| Diversión del capítulo 1 | Cursor + Grok | `docs/equipo/TAREAS_CURSOR_GROK.md`: CG-7 a CG-9 (la crecida y la gota se juegan, diálogo que no bloquea); el modo creador espera. |

## Lo que falta para el piloto escolar
**Técnico**
- [ ] FPS en equipos reales con `#fps`: Android (Kelvin lo tiene), un Chromebook escolar y un iPad.
- [x] Rendimiento de las ruinas (150 draw calls) y memoria de texturas de edificios (81 MiB): KIMI-Task-001 (`b5bf103`) y 002 (`8586f72`).
- [ ] Edificios: los `_hd` boca abajo ya están (KIMI-Task-009); quedan la Ciudad de los 36 y los edificios rotos (BM133 y BM134, en la Mac) y la flora en el mar o pegada a la montaña (KIMI-Task-006 y 008, en curso).
- [x] Encender el mapa real en los caps. 5 y 6 (`cf88e2ab`, 3-nov).
- [x] iPad en el tepuy del cap. 5: 6,9 M → 0,36 M triángulos en calidad baja y asentadas 37-58 FPS en emulación fiel a CPU ×4 (8-nov, KIMI-288 sobre el LOD KIMI-011/`33fb0e2`; prueba física con `#fps` en el iPad de Kelvin pendiente); el zoom en bucle no se reproduce (BM131, `24b1a26a`).
- [x] Revisar en una Mac los rojos que dependen del orden de las baterías (BM116, `6f4604e9`, 6-nov).

**Con niños y familias**
- [ ] Prueba de juego con niños y niñas (duración real y qué les divierte), antes que cualquier piloto en aula.

**Legal y datos**
- [ ] Revisión de privacidad infantil (COPPA) antes del piloto, y antes de que el modo creador permita compartir nada.
- [ ] Reglamento 5282 sobre la bandera de Puerto Rico en ropa y ventas (lo lleva Kelvin).
- [ ] Datos educativos: de las 31 fichas de BM84, 27 verificadas, 1 narrativa, 2 canon y 1 cifra de catálogo; quedan por cerrar el cartel del nido, el coquí y el tren (fuente primaria) y `depr_2022` (`docs/equipo/DATOS_VERIFICADOS.md`); siempre con fuente.

**Decisiones de Kelvin** (no las toma el equipo)
- [ ] Estado UICN de 13 especies que no coinciden con el catálogo (`docs/equipo/ESPECIES_DISCREPANCIAS.md`).
- [ ] Aspecto de las voces, de la navegante y de las especies extintas (martinicana y violacea: piel provisional en el juego, `a188c4e9`, a falta de su visto bueno); canon e historia de los caps. 2–6.
- [ ] Escala de los bohíos, correo de contacto, monto del pitch, hosting del piloto y qué se comparte en el modo creador.

## Temporada 1 completa, en el mapa real

Las fechas dependen del mundo único y de las decisiones de Kelvin; no se prometen todavía.

| Ep. | Título | Lo nuevo |
|---|---|---|
| 1 | El día que el cielo se rompió | Jugable (al 100 %) |
| 2 | Un lugar para todos | Hogar permanente, tres características del terreno, dos residentes; escuchar también es liderar |
| 3 | Más allá de la bahía | Construir el primer bote, navegar y llegar a otra comunidad |
| 4 | El precio del progreso | Proyecto con beneficios y costos, sin una sola respuesta correcta |
| 5 | Las voces olvidadas | Transmisor, ruinas y relevo de comunicación; la memoria del Guardián |
| 6 | El pacto de los 36 | Puzzle cooperativo; la fuerza de Vittata es ayudar a otros a trabajar juntos |

Cada episodio reutiliza el motor, el personaje, el ropero, el criadero, el guardado y el cómic. Lo nuevo es mapa, misiones, historia, lecciones y arte.

## Después de la temporada 1
- Luma, el Guardián y las demás especies como modelos 3D propios.
- Ajustes de accesibilidad: tamaño de texto y remapeo de teclas.
- Family Quest: actividades opcionales en familia y viñeta conmemorativa.
- Minijuego de piloto.
- Peces invasores reales de Puerto Rico (pez león en los arrecifes; tilapia y pleco en los ríos), con fuente verificada (NOAA, USGS, DRNA): fichas del Diario y una actividad de observación, nunca como enemigos (Kelvin, 8-nov: para la expansión).
- Iguana verde (especie invasora en Puerto Rico): ficha del Diario y observación con fuente verificada (DRNA, USFWS), nunca como enemigo (Kelvin, 9-nov).
- Construir libre: **en marcha para todos** (9-nov, Kelvin: «Piezas aprobadas»). Nido, techo de hojas y decoración: tarjeta «Construir» en «¿Cómo quieres jugar?», botón del martillo junto a Pausa y tecla B. Todas las piezas desde el principio (sin recolectar), 40 piezas (24 en calidad «bajo» y Modo Escuela). Pesca e invasoras siguen tras `?expansion=1`.
- Grito del Yunque: sonido más largo y profundo (Kelvin, 9-nov: «por ahora está bien»).
- Minijuego de pesca (Kelvin, 8-nov: para la expansión; la lista completa la da Kelvin después del cierre).
- Empaquetado para tiendas (Capacitor) si hace falta.
- Cotorras en línea (Kelvin, 9-nov: aprobado para la expansión): salas por código con el Realtime de Supabase, solo especie, posición, vuelo y gestos con un id al azar; sin nombres, chat ni cuentas. Primera versión en `src/game/en_linea.js` (botón «Jugar en línea» de la pausa); falta probarla en familia antes de anunciarla.
- Temporadas 2 a 6, según `docs/STORY_BIBLE.md`.

## Ritmo y límites
- Se trabaja siempre en la rama `main`: código, landing (`web/`), documentación y sitio publicable (`sitio/`).
- El trabajo lo hace un equipo de agentes de Claude por roles, coordinados. QA valida de forma independiente antes de cada publicación.
- Tope de uso semanal fijado por Kelvin en **45 %**. Al llegar a ese tope se guarda todo y se para una semana.
