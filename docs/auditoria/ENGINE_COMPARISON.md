# ENGINE_COMPARISON · matriz

## Método
- Escala de 1 a 5 (5 = mejor para Amazona Verse hoy).
- Solo pongo nota cuando hay evidencia:
  - **M:** medido aquí;
  - **D:** documentación oficial citada en `CLAUDE_INTEGRATION_OPTIONS.md`;
  - **—:** sin evidencia suficiente; no se puntúa.
- **Supuestos:**
  - el producto es un juego web para escuelas (Chromebook e iPad);
  - hoy se distribuye como artifact de claude.ai;
  - el equipo son agentes de Claude más Kelvin;
  - no se incluyen porcentajes de ahorro.

## Matriz
| Criterio | Motor actual (Three r128 + AVE) | Godot 4.7.2 | Unity 6.3 | Unreal 5 / otros web |
|---|---|---|---|---|
| Reutilización de código | **5** M (todo) | **1** M (nada del JS) | **1** (nada del JS) | Babylon o PlayCanvas: **2** (la lógica JS sí; el render y los loaders no) |
| Reutilización de modelos 3D | **5** M | **5** M (GLB con rig, clips y piel importados en la PoC) | — (NV) | — |
| Velocidad de desarrollo con agentes | **4** M: 5 versiones y 120 commits el 24-oct; 9 puntos de la PoC en ~2 min | **4** M: 9 puntos de la PoC en ~2 min | — | — |
| Integración con Claude (niveles 1, 2 y 4) | **4** M (falta CI) | **4** M (CLI sin interfaz nativa) | **3** D (MCP oficial en beta, con cuenta y suscripción) | — |
| Calidad gráfica alcanzada | **4** M (`img/v20_mundo.jpg`) | **2** M en la PoC (sin ajustar). Su techo nativo es más alto, pero en web solo hay Compatibility | — | Unreal: el techo más alto, pero no exporta a web: **1** para este producto |
| Animación | **4** M: 5 clips más una capa procedural rica (IK, alas, pico, parpadeo) | **4** M (AnimationPlayer; AnimationTree disponible) | — | — |
| Rendimiento móvil | — (sin dispositivos). Riesgos: 19,4 MB y 5 contextos | — | — | — |
| Exportación | **3** M: web y artifact sí; nativo no | **3** D: nativo sí; web sin C# y con `.wasm` grande que **no cabe en el artifact** | — | — |
| Pruebas automáticas | **4** M: 316 comprobaciones, sin CI | **4** M: CLI con código de salida | — | — |
| Costo | **5**: sin licencias | **5**: MIT, sin cuenta | **3** D: Personal gratis hasta 200.000 USD; Unity AI de pago | Unreal: regalías del 5 % por encima de 1 M USD (no verificado aquí) |
| Mantenimiento | **3** M: sin bundler ni tipos; r128 es de 2021 | — | — | — |
| Riesgo de migración | **5** (no hay migración) | **1** M: reescritura completa y pérdida del canal artifact | **1**: lo mismo, más cuenta y licencia | — |

## Lectura
- Godot empata con el motor actual en modelos, velocidad de Claude y pruebas.
- Pierde por mucho en reutilización y en riesgo.
- Su ventaja real, la exportación nativa, no es lo que pide el producto hoy: web, escuelas y artifact.
- Unity no se pudo probar sin cuenta. Su MCP oficial está en beta y es de pago, así que no hay evidencia que justifique elegirlo.
