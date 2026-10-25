# PROOF_OF_CONCEPT_RESULTS · motor actual (Three.js r128) frente a Godot 4.7.2

**Alternativa elegida:** Godot.
- Es la única que se puede probar sin cuenta.
- Unity Hub y la activación del Editor exigen un Unity ID, y el MCP oficial exige Unity Cloud y una suscripción al beta de Unity AI (`CLAUDE_INTEGRATION_OPTIONS.md`).
- Unreal no exporta a web.

**Mismo guion en las dos, escrito por el mismo agente (Claude):**
- fuentes en `docs/auditoria/poc/`;
- se ejecutan en `~/AmazonaVerse/_auditoria_motores/poc/`.

**Descargas:**
- Godot `Godot_v4.7.2-stable_macos.universal.zip`, de 170,6 MB:
  - aprobada por Kelvin;
  - SHA512 verificado contra `SHA512-SUMS.txt`;
  - notarizada por Prehensile Tales B.V.
- Las plantillas de exportación (1.281 MB) **no se aprobaron**.

## Resultado por criterio
| # | Criterio | Three.js r128 (`poc/three`) | Godot 4.7.2 (`poc/godot/proj`) |
|---|---|---|---|
| 1 | Cotorra original (`vittata.glb`: malla de cotorrofiver.blend, 60 huesos y 5 clips) | Sí | Sí. Importación sin ventana en 33 s; textura a `.ctex` |
| 2 | Movimiento 3D | Sí: cinemático en suelo plano, sin física (como el juego) | Sí: `CharacterBody3D` con colisión de cápsula |
| 3 | Cámara | Sí | Sí |
| 4 | Caminar (clip Walk, mezcla con Idle) | Sí (`AnimationMixer`) | Sí (`AnimationPlayer`; hubo que activar el bucle a mano) |
| 5 | Accesorio intercambiable (gorra y sombrero con piel, reenlazados al esqueleto por nombre de hueso) | Sí. 10 cambios sin fuga de geometrías | Sí. 10 cambios sin fuga de nodos. Se ve bien puesto en la cabeza (`img/poc_godot.png`) |
| 6 | Huevo que se bambolea, saca patitas y camina | Sí (procedural, igual que el criadero real) | Sí (procedural) |
| 7 | Guardado y recuperación (escritura `.tmp`→final, rechazo de corrupción) | Sí (`localStorage`) | Sí (`user://`, `FileAccess`) |
| 8 | Prueba automática | **23/23**: en el navegador y por CLI en Chrome sin interfaz (`run_test.sh`, sale con 0) | **24/24** por CLI: `Godot --headless -s res://tests/run_tests.gd`, sale con 0 (`test_run1.log`) |
| 9 | Compilación ejecutable | Es la carpeta estática que ya se publica como artifact (v20 lo demuestra con 231 archivos). No hay paso de compilación | **Bloqueado:** faltan las plantillas de exportación (1.281 MB, no aprobadas). Solo corre dentro del binario del editor |

La diferencia 23 frente a 24 se explica porque Godot separa en dos comprobaciones lo que Three.js valida en una: el enlace de los huesos. La cobertura es la misma.

## Métricas
| Métrica | Three.js | Godot |
|---|---|---|
| Tiempo de implementación del agente (reloj) | ~2 min hasta 23/23 en el navegador, más ~10 min para que Chrome sin interfaz devolviera el resultado por CLI (flags y tiempo virtual) | ~2 min hasta 24/24, más 33 s de importación |
| Errores hasta pasar | 0 de lógica; 4 intentos fallidos con Chrome headless | 1 de análisis de GDScript (tipo inferido) |
| Trabajo manual humano | 0 | 0 |
| FPS (M4, 1280×720) | **No medido:** con el panel oculto rAF quedó en 0, y Chrome con ventana bajo `-b` no informó | **77,9** de media (mín 52), con `nice -n 15` sin `-b` (aprobado). Con `-b`, 27,4 |
| Draw calls y triángulos | No medido | 15,6 y 40.562 |
| Memoria | No medida | RSS 214 MB · estática 42 MB · video 19,8 MB |
| Calidad visual | La del juego real, ya ajustada: color sRGB/ACES, materiales y sombras (`img/v20_*.jpg`) | Sin ajustar: colores saturados y la ropa sin el recoloreo por nombre de material (TELA o ACENTO) que hace el juego. Igualarla supone rehacer el pipeline de color de `wardrobe.js` |
| Tamaño de la salida web | Lo que ya se publica | No medido (sin plantillas). Fuente comunitaria: `.wasm` por defecto de ~42 MB, ~¼ con gzip. **Supera el límite de 15 MB por archivo binario del artifact** |
| Mantenimiento | Mismo código y pruebas que el juego | Hay que reescribir el juego para llegar aquí (ver `ASSET_REUSE_REPORT.md`) |

## Conclusión
- **Godot cumple:** importa el modelo y el rig originales sin pérdida, y su CLI sin interfaz es más directa para CI que Chrome headless.
- **El motor actual también cumple los 9 puntos.** Además los tiene en producción con 316 comprobaciones.
- **La PoC no muestra ninguna capacidad que falte hoy.** Lo que Godot añadiría es la exportación nativa y un editor visual, y eso no es el cuello de botella del proyecto (`FINAL_RECOMMENDATION.md`).
- **Lo que no se probó y por qué:**
  - exportación y build de Godot: plantillas no aprobadas;
  - FPS de la escena web: panel oculto;
  - Unity: requiere cuenta.
