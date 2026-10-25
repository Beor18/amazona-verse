# Amazona Verse: roadmap y pendientes

Actualizado el 25 de octubre de 2026, con la **versión 25** publicada en https://amazona-verse.vercel.app (`main` en 52d7558).
Detalle de bugs en `docs/equipo/BUGS.md`, decisiones en `docs/DECISION_LOG.md` y plan técnico del auditor en la rama `auditoria-motores` (`docs/auditoria/`).

## Dónde estamos

**Capítulo 1, "El día que el cielo se rompió": jugable de principio a fin en el navegador.**

| Área | Estado |
|---|---|
| Motor propio sobre Three.js r128, separado del contenido (`content/cap1`, `content/plantilla`) | Hecho |
| Vittata con el modelo original de Kelvin: vuela, se posa en ramas y techos, nada, agarra | Hecho |
| Ropero: 40 piezas modeladas en Blender, bandera de PR según su guía | Hecho |
| Escena de 3ds Max de Kelvin en el mapa: 376 edificios de 64 modelos, carga por zonas y LOD | Hecho |
| Misión educativa «La ruta de la gota», paradas de ciencias, Diario y Modo Maestro (DEPR 2022 / NGSS) | Hecho |
| Criadero: huevo, eclosión, bebé → juvenil → adulto; la cría acompaña a Vittata | Hecho |
| Cómic personal con viñetas de eventos reales (PNG) | Hecho |
| Guardado v5 con migraciones y recuperación | Hecho |
| Recuperación si el equipo pierde el contexto gráfico (Chromebook) | Hecho |
| Descarga inicial de **7,98 MB** (meta ≤ 8 MB), con meshopt y WebP | Hecho |
| 13 baterías automáticas (`tools/build/test.sh --extra`) y E2E de QA | Hecho |
| Datos verificados de las 34 especies de Amazona y las 2 extintas | Hecho, con 13 estados UICN pendientes de decisión |
| Pitch v1 (2:45) y página web con video | Hecho |

**Decisión técnica:** se mantiene el motor actual y se le añaden herramientas, sin migrar a Unity ni a Godot (auditoría V7.0, opción B).

## Fase 0: capítulo 1 listo para un piloto escolar

Estimado: **del 31 de octubre al 8 de noviembre de 2026**, sujeto a las dependencias externas.

### Técnico
- [ ] Medir FPS en hardware real con `#fps`: Android (Kelvin lo tiene), un Chromebook escolar y un iPad.
- [ ] Integración continua en GitHub Actions: `tools/build/build.sh` + `test.sh` en cada push, que bloquee un commit roto (M-4).
- [ ] QA-30: `contextTest` falla a veces dentro de la batería, aunque solo pasa (baja).
- [ ] Validar a mano QA-32 (foto de la viñeta de rama con copa encima) y QA-33 (posición del panel `#fps`).
- [ ] Comprobar de oído los 5 sonidos del juego en un dispositivo real.
- [ ] Revisar la memoria de colisiones en móvil con la escena completa (3–5 MB estimados).

### Contenido y calidad
- [ ] Especies por textura (M-7): recuperar las texturas originales (estaban en un disco E:) o repintarlas a partir de los renders.
- [ ] Detalle final de los 3 templos grandes y del complejo de ruinas (hoy remallados, con algunas aristas facetadas).
- [ ] P2 de movimiento: interiores de los edificios grandes, posarse en piezas decorativas, cuerda del puente colgante y toldo bajo.
- [ ] Fundido de la flora que queda entre la cámara y Vittata.

### Decisiones de Kelvin
- [ ] Estado UICN de 13 especies que no coinciden con el catálogo (`docs/equipo/ESPECIES_DISCREPANCIAS.md`).
- [ ] Escala de los bohíos de su escena (~1,7 m, casi como Vittata): agrandar la aldea entera o dejarla fiel.
- [ ] Reemplazar `04_Blender_3D/vittata_rig_final.blend` para que la textura vaya dentro del archivo.
- [ ] Correo de contacto de la web y del pitch, monto del pitch y hosting del piloto.

### Legal y datos
- [ ] Reglamento 5282 sobre el uso de la bandera de PR en ropa y ventas (lo lleva Kelvin).
- [ ] Revisión de privacidad infantil (COPPA) antes del piloto.
- [ ] Citas del DRNA/USFWS para las fichas de la cotorra (huevo blanco, 24–28 días de incubación).

### Pitch y web
- [ ] Volver a montar el pitch ligero de 720p desde el master (el anterior salió recortado).
- [ ] Pitch v2 con tomas nuevas: posado, nido y escena de Kelvin.
- [ ] Formulario de contacto con backend real y publicación en el hosting final.

## Fase 1: temporada 1 completa

Estimado: **de mediados de diciembre de 2026 a mediados de febrero de 2027**, a razón de 1–3 semanas por episodio. La estimación se afinará al cerrar el episodio 2.

| Ep. | Título | Lo nuevo |
|---|---|---|
| 1 | El día que el cielo se rompió | Jugable (fase 0) |
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
