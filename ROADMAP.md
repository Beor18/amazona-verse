# Amazona Verse: roadmap y pendientes

Actualizado el **2 de noviembre de 2026**. Detalle vivo en `docs/equipo/COORDINACION_VIVO.md`, la tabla «Estado» de `docs/equipo/TAREAS_API.md`,
`docs/equipo/CAP1_PENDIENTE.md`, `docs/equipo/BUGS.md` y `docs/DECISION_LOG.md`. Publica la nube (`tools/build/publicar_nube.sh`) o la Mac (`publicar_mac.sh`), siempre con las 12 baterías obligatorias en verde; este documento no
dice qué versión está en línea (míralo en la hoja viva).

## Dónde estamos (2-nov)
- **Capítulo 1 al 100 %.** Jugable de principio a fin; sobrinos de Kelvin lo terminaron en 16 min; en un Android y un iPad corre a más de 30 FPS. Solo quedan decisiones de Kelvin (`docs/equipo/CAP1_PENDIENTE.md`, `PENDIENTES_KELVIN.md`).
- **Capítulos 2 a 6 con contenido y pruebas** (`content/ep2`…`ep6`): `ep2Test` 60/60, `ep2e2eTest` 71/71, `ep3Test` 71/71, `ep4Test` 63/63, `ep5Test` 74/74, `ep6Test` 79/79 y `temporadaE2eTest` 22/22 (BM85, 31-oct), con el registro de temporada compartido entre capítulos.
- **Mundo único** (decisión de Kelvin, 1-nov): los caps. 2 a 6 pasan del mundo de relleno al mapa real del cap. 1, una zona por capítulo. Plan en `docs/equipo/MUNDO_UNICO.md`.
  - **Hechos y publicados:** cap. 2 en Caney del Meandro (BM111), cap. 3 en el río de Villa Raíz hasta su desembocadura y la laguna (BM112), cap. 4 en el río al este de Villa Raíz (BM113; Los Portales del Río son un cañón y no sirven).
  - **Zonas** (BM114, `src/game/zonas.js`): se abre la zona del capítulo en curso y las ya jugadas; lo demás se ve de lejos y el viento avisa. `temporadaE2eTest` 31/31 en el mundo único (BM122).
  - **Caps. 5 y 6:** ya en el mapa real, tras un interruptor apagado (`MAPA_REAL` o `?mapa=real`). Se encienden cuando Kimi termine KIMI-Task-001 a 003 (draw calls y color de las ruinas); antes, capturas de la Mac (BM127).
- **Modo creador: después de terminar el juego** (Kelvin, 2-nov; `TAREAS_CURSOR_GROK.md`). Base preparada en `MUNDO_UNICO.md`: parcelas en zonas libres, catálogo del kit actual, presupuesto por parcela, sin chat.
- **Pieles de especie y retratos:** 31 especies con piel (BM109); agilis, albifrons y festiva en curso (BM124); martinicana y violacea solo como propuesta; retratos de Nudo y de los visitantes del cap. 6 y del Aprendiz (BM110, BM115); landing con el verde v4 (BM118).
- **Pruebas:** 12 baterías obligatorias en verde en la última publicación de la nube (`docs/TEST_REPORT.md`). Las extra que solo fallan en la Mac (`idiomaTest`, `camaraTest`, `accesibilidadTest`, `trenTest`, `ep2e2eTest`) siguen en BM116; QA-85 es intermitente.

## Carriles (no se pisan)
| Carril | Quién | Qué |
|---|---|---|
| 3D: edificios, ciudad, terreno y mapa | Kimi y Fernando | `docs/equipo/TAREAS_KIMI.md` (KIMI-Task-001 a 010). Nadie más toca lo gráfico del mundo. |
| Contenido, historia, inglés, accesibilidad, web, documentos | Agente web | Ronda 10 de `TAREAS_API.md` (BM124 a BM126). |
| GitHub, integración, hoja viva, flora translúcida (B1) y objetos de la historia (hito 28) | Coordinadora (nube) | Revisa e integra lo de todos. |
| GPU real, Blender y publicación | Mac | Cola BM116, BM119, BM121, BM127, BM128; publica `sitio/` solo con las 12 baterías obligatorias en verde. |
| Diversión del capítulo 1 | Cursor + Grok | `docs/equipo/TAREAS_CURSOR_GROK.md`: CG-7 a CG-9 (la crecida y la gota se juegan, diálogo que no bloquea); el modo creador espera. |

## Lo que falta para el piloto escolar
**Técnico**
- [ ] FPS en equipos reales con `#fps`: Android (Kelvin lo tiene), un Chromebook escolar y un iPad.
- [ ] Rendimiento de las ruinas (222 draw calls, meta ≤ 150) y memoria de texturas de edificios (313 MB, meta < 100 MB): KIMI-Task-001 y 002.
- [ ] Edificios con defectos (28 de 64 en la auditoría del 1-nov), `_hd` boca abajo y flora en el mar o en la montaña: KIMI-Task-005 a 010.
- [ ] Encender el mapa real en los caps. 5 y 6 (los caps. 2 a 4 ya están; 5 y 6 tras Kimi).
- [ ] Revisar en una Mac los rojos que dependen del orden de las baterías (BM116).

**Con niños y familias**
- [ ] Prueba de juego con niños y niñas (duración real y qué les divierte), antes que cualquier piloto en aula.

**Legal y datos**
- [ ] Revisión de privacidad infantil (COPPA) antes del piloto, y antes de que el modo creador permita compartir nada.
- [ ] Reglamento 5282 sobre la bandera de Puerto Rico en ropa y ventas (lo lleva Kelvin).
- [ ] Datos educativos: de las fichas de BM84, 10 verificadas, 9 parciales y 10 por verificar; siempre con fuente.

**Decisiones de Kelvin** (no las toma el equipo)
- [ ] Estado UICN de 13 especies que no coinciden con el catálogo (`docs/equipo/ESPECIES_DISCREPANCIAS.md`).
- [ ] Aspecto de las voces, de la navegante y de las especies extintas (martinicana y violacea: solo hay propuesta); canon e historia de los caps. 2–6.
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
- Empaquetado para tiendas (Capacitor) si hace falta.
- Temporadas 2 a 6, según `docs/STORY_BIBLE.md`.

## Ritmo y límites
- Se trabaja siempre en la rama `main`: código, landing (`web/`), documentación y sitio publicable (`sitio/`).
- El trabajo lo hace un equipo de agentes de Claude por roles, coordinados. QA valida de forma independiente antes de cada publicación.
- Tope de uso semanal fijado por Kelvin en **45 %**. Al llegar a ese tope se guarda todo y se para una semana.
