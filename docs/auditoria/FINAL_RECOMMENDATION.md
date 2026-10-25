# FINAL_RECOMMENDATION

## Decisión: **B. Mantener el motor actual e integrar nuevas herramientas.**

## Respuesta a la pregunta 2
> ¿Integrar Claude con Unity, Godot u otras herramientas nos deja terminar antes y mejorar el producto lo bastante para justificar su costo?

- **Con Unity o Godot, no.** Claude escribe, ejecuta y verifica igual de bien en el motor actual: los niveles 1, 2 y 4 están medidos. El control de editor por MCP solo es oficial en Unity, y allí está en beta, con cuenta y de pago. Migrar costaría semanas y el canal artifact.
- **Con herramientas añadidas al motor actual, sí:** CI sin interfaz, compresión de GLB y dispositivos reales. Son baratas y atacan los riesgos que sí están medidos.

## Evidencia clave
1. **El motor actual funciona y ya está probado.**
   - v20 pasa 316/316 comprobaciones y el E2E 13/13, con 0 errores.
   - Están en producción los 9 puntos de la PoC, y más: mapa de El Yunque, aula, cómic y criadero.
2. **Migrar no gana nada medible en lo que hace Claude.**
   - En Godot, la misma escena de 9 puntos salió en el mismo tiempo de agente (~2 min) que en Three.js.
   - Godot importó el modelo y el rig originales sin pérdida. Lo que no hace es aportar nada que hoy falte.
3. **Migrar cuesta mucho y rompe el canal de distribución.**
   - Habría que reescribir ~15.700 líneas y 316 comprobaciones.
   - El `.wasm` de Godot (~42 MB, cifra comunitaria) no cabe en el artifact (15 MB por binario).
   - Unity exige cuenta y una suscripción a Unity AI en beta.
4. **Los problemas reales se arreglan sin migrar.**
   - M-1 y M-2 ya están aplicados en esta rama y medidos: 46 → 1 peticiones 404 y 15,2 → 0 MB de base64 residente.
   - Siguen M-3 (peso), M-4 (CI) y M-5 (contexto WebGL).
5. **Las 34 cotorras no dependen del motor.** Hay una malla con rig y 34 texturas, de las que solo se conservan los renders. El trabajo es de texturas, igual en cualquier motor.

## Herramientas que hay que integrar
- **CI con Chrome sin interfaz:** M-4, basado en `tools/build/avtest.py`.
- **gltfpack o meshopt en la build:** M-3. La descarga necesita aprobación.
- **Dispositivos reales para la matriz de FPS:** H3. Ver más abajo.

**Godot como plan B:**
- Queda como opción si algún día se necesitan apps nativas o se sale del artifact.
- La PoC (`docs/auditoria/poc/godot`) sirve de punto de partida.
- **No migrar ahora.**

## Riesgos de esta decisión
- Three r128 envejece.
- El rendimiento en el hardware escolar sigue sin medirse.
- El peso sigue alto hasta aplicar M-3.

Ver `MIGRATION_RISK_REPORT.md`.

## Decisiones que necesitan a Kelvin
1. **No migrar:** confirmarlo.
2. **Dispositivos de prueba:** conseguir un Chromebook y un iPad o Android de gama escolar. Es dinero o un préstamo.
3. **Texturas originales de las 34 especies:** buscarlas en el disco viejo o en Drive. Si no aparecen, aprobar repintarlas.
4. **Unity AI o el MCP de Unity:** solo si algún día se reabre la opción Unity. Requiere cuenta y suscripción; hoy no lo recomiendo.
