# PROJECT_STATUS · 24 oct 2026

**Hito actual:** 6, motor de cómic (completado en web). **Siguiente:** 7, cómic oficial, o 8, el bote (ver BACKLOG).

| Hito | Estado | Nota |
|---|---|---|
| 0 Base | TESTED | Repo Git, servidor de pruebas, documentación |
| 1 Vittata | TESTED (sustituto) | Movimiento, cámara, colisiones, joystick táctil; Vittata como sprite del render |
| 2 Interacción | TESTED | Objetos, NPC, diálogos, recursos, inventario |
| 3 Construcción | TESTED | Plano, colocación con validación, costo, estructura persistente |
| 4 Capítulo 1 | TESTED | Luma, dos terrenos, crecida, corrección, Guardián, transmisor, final |
| 5 Personaje del jugador | TESTED | Nombre inventado, plumaje, pañuelo, accesorio, retrato, guardado. Expresión facial: NOT STARTED (necesita modelo con rig) |
| 6 Motor de cómic | TESTED | Eventos con esquema, selección por eventos reales, editor, PNG y PDF inspeccionados |
| 7 Cómic oficial | NOT STARTED | Necesita aprobar el diseño de Vittata |
| 8 Bote | NOT STARTED | El plano ya se desbloquea al final del capítulo 1 |
| 9 Comunidad | NOT STARTED | Indicadores básicos ya existen |
| 10 Family Quest | NOT STARTED | |
| 11 Builds por plataforma | BLOCKED | Web funciona; iOS/Android nativos requieren cuentas y Xcode completo |

**Pruebas:** `AV.selfTest({saveFiles:true})` → 45/45 en Chromium de escritorio (24 oct).
**Bugs conocidos:** capturas de escena con cielo muy claro; en móvil el panel de misión ocupa espacio (ahora solo muestra el paso actual); la tira vertical deja viñetas bajas.
**No probado:** iPhone/Android reales, Safari, rendimiento en móviles, duración real del capítulo.
