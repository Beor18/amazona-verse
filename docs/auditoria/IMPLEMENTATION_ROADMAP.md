# IMPLEMENTATION_ROADMAP

## Plan (opción B)
| Orden | Qué | Dueño | Hecho cuando |
|---|---|---|---|
| 1 | Correr la batería completa sobre `auditoria-motores` (M-1 y M-2) en los dos servidores. Si pasa, el coordinador integra `src/engine/assets.js` | QA y coordinador | 11 baterías en verde y 1 solo 404 en el modo artifact |
| 2 | Commitear `tools/build` y activar la CI (M-4) | Build engineer | Un commit roto queda bloqueado |
| 3 | Recompresión de texturas y gltfpack en la build (M-3); carga diferida de ropa y edificios (H2) | Build, gráfico y traits | Descarga inicial ≤ 8 MB, medida con `srv_artifact.py` |
| 4 | `webglcontextlost` y renderer compartido (M-5), un solo controlador de calidad (M-9) | TA y gráfico | Prueba con `loseContext()` y sin pantalla negra |
| 5 | Matriz de FPS en dispositivos reales (H3) | QA | Cifras de Chromebook, iPad y Android |
| 6 | Pipeline de Vittata reproducible (M-6), especies por textura (M-7), entrada al criadero (M-10), limpieza del artifact (M-8) y documentación (M-11) | TA, huevos y coordinador | Firmas iguales y capturas por especie |

## Tiempo restante (§10)
**Base medida:**
- El 24-oct, unos 20 agentes produjeron 120 commits y 5 versiones publicadas (v16–v20).
- Antes de esa fecha no hay historial de git, así que **no se puede medir el esfuerzo total del capítulo 1**.

**Supuestos:**
- «Terminar» significa: el capítulo 1 listo para un piloto escolar, con peso ≤ 8 MB, FPS medidos en dispositivos reales y CI.
- La temporada 1 (5 episodios más, `STORY_BIBLE.md`) se trata aparte.
- Las dependencias humanas no dependen del motor: aprobar el diseño de Vittata, validar las fichas con el DRNA, revisar COPPA y conseguir dispositivos.

| Escenario | Capítulo 1 listo para piloto | Temporada 1 | Confianza | Comentario |
|---|---|---|---|---|
| **A. Seguir igual** | 3–7 jornadas de equipo, más lo que tarden los dispositivos | Cada episodio reutiliza el motor (templateTest lo prueba) y solo añade contenido y sistemas: 1–3 semanas por episodio | Baja (no hay historial previo) | Arriesga otra publicación rota sin CI y peso alto en la escuela |
| **B. Optimizar sin migrar** | Igual que A, más 1–2 jornadas al principio (pasos 1–4) | Igual que A, con menos retrabajo | Baja-media | Lo recomendado: cuesta poco y quita los riesgos medidos |
| **C. Migrar a Godot** | Paridad con v20: 3–6 semanas de equipo antes de volver al punto actual (supone reescribir ~15.700 líneas y 316 comprobaciones al ritmo observado), más hosting nuevo | A + C | Baja | El capítulo 1 queda congelado durante la migración |

Los rangos son estimaciones con los supuestos de arriba, no fechas.
