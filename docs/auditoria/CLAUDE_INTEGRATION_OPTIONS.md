# CLAUDE_INTEGRATION_OPTIONS · qué puede hacer Claude con cada motor

**Estados posibles:**
- Disponible (D);
- Requiere configuración (RC);
- Requiere herramienta comunitaria (HC);
- No disponible (ND);
- No verificado aquí (NV).

**Cuatro niveles de integración:**
1. Claude escribe código.
2. Claude ejecuta herramientas del proyecto.
3. Claude controla el editor por MCP.
4. Claude verifica resultados reales.

**Fuentes consultadas el 2026-10-24:**
- [Unity AI · MCP get started (com.unity.ai.assistant 2.0)](https://docs.unity3d.com/Packages/com.unity.ai.assistant@2.0/manual/unity-mcp-get-started.html), con el paquete actual en 2.21.0-pre.1;
- [Unity blog, 11-may-2026: «Unity AI Open Beta: How to get started with MCP»](https://unity.com/blog/unity-ai-mcp-how-to-get-started);
- [Unity's plugin for Claude Code](https://docs.unity.com/en-us/ai/unity-plugin/claude-code);
- [precios de Unity](https://unity.com/runtime-fee);
- [Godot 4.7: exportar a web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html);
- release 4.7.2-stable de Godot en GitHub;
- MCP comunitarios de Godot ([Coding-Solo/godot-mcp](https://mcpservers.org/servers/Coding-Solo/godot-mcp), Beckett, Funplay y Godot AI);
- [releases de three.js](https://github.com/mrdoob/three.js/releases/latest) (r186).

## Matriz
| Capacidad | Motor actual (web) | Unity 6 (6.3 LTS) | Godot 4.7.2 |
|---|---|---|---|
| 1 · Crear escenas, objetos, materiales y animación en código | **D**, verificado: todo el juego lo escribieron agentes | D (C#), NV aquí | **D**, verificado en la PoC (GDScript) |
| 2 · Ejecutar el proyecto, las pruebas y el pipeline | **D**, verificado: Blender sin ventana (ropa, mapa, entorno), servidores locales y Chrome sin interfaz por CLI (`poc/three/run_test.sh`) | RC: Unity CLI y `-batchmode -runTests`. **Requiere Unity ID** para activar el Editor (bloqueado para el agente). NV | **D**, verificado: `--headless --import`, `-s tests/run_tests.gd` con código de salida, corrida con ventana y captura desde código |
| 3 · Controlar el editor por MCP | No hay editor. El equivalente es **D** y verificado: el panel del navegador por MCP (navegar, ejecutar JS, capturas y consola) y Blender por CLI | **RC:** MCP oficial de Unity (`com.unity.ai.assistant`), en **beta abierta** desde mayo de 2026. Exige proyecto en Unity Cloud y **prueba o suscripción a Unity AI**; Claude Code es un cliente soportado. También existe el plugin oficial de Unity para Claude Code (solo skills; usa Unity CLI con el Editor abierto) y MCP comunitarios (HC). NV | **HC:** no hay MCP oficial. Los comunitarios (Coding-Solo, que necesita Node.js y no está instalado; Beckett, Funplay y Godot AI) no se probaron. NV |
| 4 · Verificar resultados reales (pruebas, capturas, rendimiento) | **D**, verificado: 316 comprobaciones, capturas, `renderer.info` y Resource Timing. **Límite:** los FPS exigen el panel visible y no hay dispositivos reales | NV | **D**, verificado: 24/24, captura PNG y monitores `Performance` |
| Leer errores | D (`__aveErrores`, consola por MCP) | RC (`Unity_ReadConsole` por MCP) | D (stderr de la CLI) |
| Compilar o exportar | D: carpeta estática y artifact | RC: build por CLI más los módulos de plataforma. NV | **Bloqueado:** plantillas de 1,28 GB no aprobadas. Web: solo Compatibility/WebGL2, **sin C#**, `.wasm` de ~42 MB (fuente comunitaria) |
| Analizar rendimiento | D (QA battery) | RC (Profiler; por MCP no está documentado) | D (monitores) |

## Lectura
- **Escribir código, que es lo que más usa el equipo, no cambia de un motor a otro.**
- **La diferencia está en el nivel 3:**
  - Unity tiene el control de editor más completo y oficial, pero en beta, con cuenta y con suscripción de pago. Eso es una decisión de Kelvin (dinero y licencia).
  - Godot no tiene control oficial del editor, pero su CLI basta para los niveles 2 y 4 sin cuenta y sin coste.
- **El motor actual ya tiene los niveles 1, 2 y 4 funcionando.** Lo que le falta es CI que los dispare sola (`ENGINE_AUDIT.md` M-4).
