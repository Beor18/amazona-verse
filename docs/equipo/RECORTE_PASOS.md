# Recorte de pasos (CG-38)

Kelvin, 3-nov: cada capítulo queda en 6 pasos, más corto y más fácil. La historia no cambia: los diálogos, las revelaciones, Mara y Vela, el Guardián y la medalla siguen, dentro de un paso más grande. Se quitaron los «camina hasta X y habla» que iban solos y se unieron los repetidos (probar / mejorar / probar otra vez se queda cuando es el aprendizaje).

| Cap. | Antes | Ahora (6) | Qué se unió |
|---|---|---|---|
| 1 | 8: vuelo, taller, recolectar, ruta de la gota, refugio, Guardián, transmisor, mirador | 0 vuelo · 1 taller · 2 recolectar · 3 ruta de la gota · 4 refugio y Guardián · 5 transmisor, medalla y mirador | El Guardián entra al terminar la crecida. El mirador entra al encender el transmisor. Los índices 0–3 no se mueven. |
| 2 | 11 | 0 hablar, leer la tierra y contarlo · 1 plano, preguntas y tarjetas · 2 casa y nido · 3 tormenta · 4 mejorar · 5 probar otra vez | Tres idas a hablar pasan a ser el principio o el cierre del paso. |
| 3 | 14 | 0 papá, predecir y probar · 1 armar y botar · 2 ajustar y botar otra vez · 3 navegante, leer el agua y señales · 4 práctica y timón · 5 bahía y saludo | |
| 4 | 9 | 0 hablar, orilla y contarlo · 1 voces y Balanza · 2 maqueta · 3 asamblea · 4 construir · 5 primer cruce | |
| 5 | 13 | 0 hablar y separar las ondas · 1 patrón y mensaje · 2 ruinas y Guardián · 3 antena y señal · 4 estaciones y relevo · 5 ayuda y niebla | Mara, Vela y la medalla del recuerdo siguen en el paso del Guardián. El paso de las estaciones conserva el id `estaciones` (QA-86). |
| 6 | 12 | 0 recibir a los 6 · 1 observar y parejas · 2 objetivo y plan · 3 levantar las tablas · 4 grupos, círculo y asientos · 5 pacto con el Guardián | El pacto queda solo. |

Fuera de este recorte: `src/game/criadero.js` sigue tratando el paso 3 del cap. 1 como la ruta de la gota. Ese índice no cambió. No se tocó el cómic (`src/game/comic.js`, CG-36).
