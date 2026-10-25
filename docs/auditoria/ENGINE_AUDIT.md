# ENGINE_AUDIT · resumen y mejoras sin migrar

**Auditor:** AV-ENGINE-AUDITOR, independiente.
**Fecha y base:** 2026-10-24, sobre `estable` = v20 (`f3ed616`).
**Rama:** `auditoria-motores`.

**Otros entregables:**
- `CURRENT_ARCHITECTURE.md`: inventario y las 34 cotorras.
- `PERFORMANCE_BASELINE.md`: medidas.
- `CLAUDE_INTEGRATION_OPTIONS.md`.
- `ASSET_REUSE_REPORT.md`.
- `ENGINE_COMPARISON.md`.
- `MIGRATION_RISK_REPORT.md`.
- `PROOF_OF_CONCEPT_RESULTS.md`.
- `FINAL_RECOMMENDATION.md`.
- `IMPLEMENTATION_ROADMAP.md`.

## Diagnóstico en cinco líneas
1. **Tecnología:** juego web en JS puro con Three.js r128 vendorizado y un motor propio modular (28 módulos, packs de contenido). El arte se hace con Blender sin ventana y se publica como artifact.
2. **Estado:**
   - funcional y probado: 316/316 comprobaciones en v20, 0 errores;
   - parcial: 34 especies, criadero sin entrada en el juego;
   - sin hacer: CI, recuperación de contexto WebGL y builds nativas.
3. **Cuello de botella real:** no es el motor. Es el peso (19,4 MB), que no hay dispositivos de escuela para medir, que no hay CI y lo que depende de Kelvin (texturas de las especies, validación cultural, aprobación de diseño).
4. **Godot** importa los modelos originales y pasa la PoC, pero obliga a reescribir todo y rompe el canal artifact.
5. **Unity** no se pudo probar sin cuenta, y su MCP oficial está en beta de pago.

## Mejoras sin migrar (verificables)
Complejidad: S (pequeña) · M (media) · L (grande).

| Id | Problema | Evidencia | Solución | Beneficio | Compl. | Riesgo | Depende de | Cómo verificar |
|---|---|---|---|---|---|---|---|---|
| **M-1** ✅ aplicado en esta rama | Cada modelo pide primero el `.glb`, que da 404 en el artifact | 46 de 172 peticiones son 404 (medido) | `assets.js`: la primera carga decide si se sirve `.glb`; las demás esperan y van directo | **172 → 127 peticiones, 46 → 1 404** (medido) | S | Bajo: si el primer `.glb` falla por otra causa, todo va por base64, que también funciona | Nadie (1 archivo sin dueño; lo integra el coordinador) | Batería completa en el servidor con `.glb` y en el de artifact. **Pendiente: no la pude correr con el panel oculto** |
| **M-2** ✅ aplicado en esta rama | Las cadenas base64 quedan en `window` para siempre | 15,2 MB en 42 cadenas (medido) | Borrar la clave del global `AV_*` después de `atob` | **15,2 MB → 0** (medido) | S | Bajo: quien vuelva a pedir un modelo lo tiene en caché; si no, se recarga el `_glb.js` | — | Igual que M-1, más el escaneo de `window.AV_*` |
| M-3 | Los GLB no tienen ninguna compresión | 0 extensiones de compresión; los edificios pesan 0,4–0,6 MB con 3–5 mil triángulos (sobre todo textura); el JSON de `vittata.glb` ocupa 216 KB | Terminar y commitear `tools/build/avbuild.py`, que ya recomprime texturas con PSNR. Añadir `gltfpack -cc` (meshopt, ya aprobado en ROADMAP_CEO) | Bajar los 19,4 MB y los 35,5 MB publicables. Cuánto, se mide después; no doy porcentajes | M | Medio: la piel cuantizada | Build engineer; **descargar gltfpack necesita aprobación** | accessoryTest, capturas y bytes |
| M-4 | No hay CI, y v18 se publicó rota (QA-17) | No hay runner. `tools/build/avtest.py` está sin commit. `poc/three/run_test.sh` demuestra que Chrome sin interfaz con tiempo virtual da un resultado por CLI | Commitear `avtest.py` y correr la batería y el E2E en cada commit a `main` (hook o tarea programada) | Ninguna versión llega a `estable` sin E2E verde | S-M | Bajo | Build engineer | Un commit roto a propósito tiene que quedar bloqueado |
| M-5 | No se maneja `webglcontextlost` y hay 5 WebGLRenderer | grep: 0 manejadores; renderers en `renderer.js:26`, `creador.js:118`, `criadero.js:500`, `character.js:1025` y `showcase.js:92` | Escuchar lost/restored con autoguardado y aviso. Un renderer fuera de pantalla compartido para retrato y miniaturas | Evitar la pantalla negra en iOS | M | Medio | TA, gráfico y huevos | `WEBGL_lose_context.loseContext()` en una prueba |
| M-6 | El pipeline de Vittata no es reproducible | 15 scripts de `tools/blender` dependen de `/private/tmp/claude-501/vittata_build`; el `.blend` no empaqueta la textura | Mover a `tools/blender/vittata/` con rutas relativas a `04_Blender_3D` (solo lectura) y empaquetar la textura | Regenerar el modelo y los clips sin depender de un temporal | S | Bajo | TA | Regenerar `vittata.glb` y comparar la firma (60 huesos, 5 clips, vértices) |
| M-7 | Hay 8 tintes en vez de las 34 especies | Las texturas originales no están; solo los renders | Recuperar `cotorrofiver-1LP_*` (disco E: o Drive). En `character.js`, cambiar `SPECIES` de tinte a textura | Las 34 cotorras de Kelvin en 3D sin modelos nuevos | M (arte) | Bajo | **Kelvin: buscar los archivos** | Captura de cada especie frente a su render |
| M-8 | El artifact arrastra archivos huérfanos | `game.js` (177 KB), `character.js`, `wardrobe.js` y `showcase.js` viejos en la raíz | Publicar con `files: {ruta: null}` para lo que ya no existe; idealmente desde el manifiesto de la build | Menos peso y menos confusión | S | Bajo | Coordinador | `Artifact list scope=files` |
| M-9 | Dos controladores de calidad pueden pelearse | `renderer.js:30` (adaptDPR) y `:61` (presets); el tirón del taller vuelve a aparecer en v20 (47,8 FPS) | Un solo controlador con histéresis común | Menos tirones al empezar | S | Bajo | Gráfico y TA | Batería de FPS con el panel visible |
| M-10 | El criadero solo se abre con `?criadero=1` o desde el Maestro | grep: nadie más llama a `criadero.abrir` | Poner una entrada en el mundo (aviario) o en el menú | Que el jugador llegue al sistema | S | Bajo | Gameplay y huevos | e2eTest con un paso nuevo |
| M-11 | Documentación desactualizada y trabajo duplicado | `ARQUITECTURA.md` dice «CDN»; `BUILD.md` no existe; los accesorios están en dos catálogos (`TEAM_AUDIT.md`); `core.js`, `assets.js` y otros no tienen dueño | Corregir los documentos, unificar el catálogo y asignar dueños | Menos ediciones cruzadas | S | Bajo | Coordinador | Revisión |

**Qué no recomiendo ahora:**
- **Actualizar three a r18x:** es un cambio grande y no hay un problema medido que lo justifique.
- **WebGPU.**
- **Rapier, Draco y KTX2:** coincido con `CTO_PLAN` §2.
