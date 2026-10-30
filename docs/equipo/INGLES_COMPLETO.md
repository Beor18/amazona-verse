# Inglés completo de los 6 capítulos (BM46)

Comprobado el 30-oct-2026 sobre la build `HEAD-f2d34ed` (`build.sh HEAD` + `test.sh --extra`), con la interfaz en inglés. No se tocó código ni diccionarios: no apareció ningún texto en español.

| Capítulo | Batería (ES y EN) | Resultado | Qué comprueba en inglés |
|---|---|---|---|
| 1 | `idiomaTest` | 16/16 | Todas las líneas de diálogo y los títulos, avisos y pasos de misión tienen entrada en `content/cap1/en.js`; con EN puesto, ningún texto visible de la interfaz queda en español; rótulos del HUD y vuelta a ES. |
| 2 | `ep2Test` 59/59, `ep2e2eTest` 71/71 | verde | Recorrido completo del episodio (sitios, tarjetas, casa, tormenta, final) con textos vistos sin traducción = 0. |
| 3 | `ep3Test` | 64/64 | `faltan()` sobre todo lo leído en el recorrido, ES y EN. |
| 4 | `ep4Test` | 53/53 | Todo texto del episodio en pantalla tiene entrada en `en.js`. |
| 5 | `ep5Test` | 72/72 | `faltan()` sobre diálogos y textos leídos. |
| 6 | `ep6Test` | 73/73 | `faltan()` sobre todo lo visto en el recorrido, ES y EN. |

Notas
- Una búsqueda estática de cadenas de `pack.js` sin clave exacta en `en.js` solo devolvió trozos armados con datos, etiquetas de prueba y notas `[KELVIN]` (no salen al jugador); las baterías de pantalla confirman que lo que sí se muestra tiene EN.
- En esta corrida `selfTest`, `missionTest` y `e2eTest` del capítulo 1 fallan por `C.aplicarEngranaje is not a function` (`historia.js:405`, cambios de otra ventana sin cerrar), ajeno al inglés; `idiomaTest` no depende de ese recorrido.
- `streamingTest` y `menuModosTest` (extra) también fallan, ajenos a esta tarea.
