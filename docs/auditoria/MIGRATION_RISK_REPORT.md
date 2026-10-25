# MIGRATION_RISK_REPORT

## Si se migra (a Godot o a Unity)
| Riesgo | Evidencia | Prob. | Impacto |
|---|---|---|---|
| Reescribir ~15.700 líneas y las 316 comprobaciones antes de tener paridad | `ASSET_REUSE_REPORT.md` | Alta | Alto: el capítulo 1 se congela mientras tanto |
| Perder el canal de publicación artifact | Límite de 15 MB por binario; `.wasm` de Godot de ~42 MB | Alta (Godot) | Alto: hay que buscar hosting propio y revisar COPPA y terceros (`SEGURIDAD_INFANTIL.md`) |
| C# no exporta a web en Godot 4 | Documentación de Godot 4.7 | Segura | Medio: obliga a GDScript |
| Cuenta, suscripción y beta en Unity | Blog de Unity, may-2026 | Segura | Medio-alto: dinero y cambios sin aviso |
| Regresión visual (color, ropa, terreno) | PoC de Godot sin ajustar | Alta | Medio |
| Doble mantenimiento durante la transición | 20 agentes sobre un solo repo | Alta | Alto: hoy ya hay ediciones cruzadas (`TEAM_AUDIT.md`) |

## Si no se migra (riesgos que siguen)
| Riesgo | Evidencia | Mitigación |
|---|---|---|
| Three r128 es de 2021, sin parches; una actualización a r18x cuesta | Release r186 (sep-2026); UMD eliminada | Fijar r128 mientras funcione. Si se actualiza, hacerlo en una rama con la batería |
| Peso de 19,4 MB en la red de una escuela | `PERFORMANCE_BASELINE.md` | M-1 y M-3 |
| Pantalla negra en iOS | 0 manejadores de `webglcontextlost`; 5 renderers | M-5 |
| Rendimiento en Chromebook o iPad desconocido | Sin dispositivos | Matriz H3 con dispositivos reales (lo compra o presta Kelvin) |
| Pipeline de Vittata no reproducible | 15 scripts que dependen de `/private/tmp` | M-6 |
