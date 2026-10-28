# Para Fujimoto: 3 agentes de Grok en Cursor (reparto nuevo del 28-oct)

Kelvin reinicia el reparto (28-oct): **hasta que el crédito de Claude se reinicie el sábado, el trabajo lo hacen los Grok** y la sesión coordinadora solo une, prueba y publica. **3 agentes de Grok a la vez**, cada uno con una tarea del lanzamiento y sin tocar los archivos de los otros. Cierra los chats de Grok que haya abiertos con tareas viejas (el cómic Manga Toon sigue en pausa). Abre en Cursor **3 chats de agente nuevos**, con el modelo Grok en modo Agent (pueden ser Background Agents), y pega en cada uno su texto.

## Grok 1: la gran ciudad del tepuy (G18)

> Eres Grok 1 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md y el final de docs/equipo/PEDIDOS.md. Tu tarea: G18, que la gran ciudad del tepuy (`kelvin_ruinas_yunque`) se vea como docs/img/ciudad_tepuy_meta_kelvin.jpg: (1) piedra blanca y crema mate, no dorada ni metálica (dentro del look único vibrant_toon); (2) sin las torres con «ganchos»: revisa orientación y escala contra el .max; (3) un conjunto con cúpulas, cornisas y almenas, no torres sueltas; (4) el conjunto de torres de la izquierda sobre la roca. Tus archivos: los edificios de la ciudad del tepuy y sus herramientas. No toques la vegetación (es de Grok 2) ni las aldeas Savage (son de Grok 3). Apúntate como «Grok 1» en docs/equipo/TRABAJO_SIMULTANEO.md. Con cada cambio visual sube su captura: `tools/build/look_capturas.py --vistas-json tools/build/mapa_vistas.json --vistas ciudad_tepuy`, guardada como docs/img/ciudad_tepuy_g18_<fecha>.jpg. Haz commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. Modo continuo. No publiques sitio/. No la marques hecha: Kelvin la aprueba.

## Grok 2: la selva sobre el tepuy (G19 = BL1)

> Eres Grok 2 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md, el final de docs/equipo/PEDIDOS.md y BL1 en docs/equipo/TAREAS_API.md. Tu tarea: G19, la selva cubriendo la cima y las laderas del tepuy alrededor de la ciudad, como en el render de 2022 (docs/img/mapa_audit_original_2022.jpg), y el bosque como un dosel continuo, no árboles sueltos de tronco blanco. Parte del trabajo a medias de la API: `git fetch origin 'refs/respaldo/*:refs/respaldo/*'` y mira `refs/respaldo/20261027-2119` (dosel_cap1*.js, terreno.js, vegetacion.js, lugares.js, tools/blender/entorno_dosel.py). Tus archivos: vegetación, dosel y terreno. No toques los edificios (Grok 1 y Grok 3). Apúntate como «Grok 2» en docs/equipo/TRABAJO_SIMULTANEO.md. Con cada cambio visual sube su captura (vistas `ciudad_tepuy` y `render2022`) en docs/img/ con la vista y la fecha. Commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. Modo continuo. No publiques sitio/.

## Grok 3: QA-53 y las aldeas (F2.2)

> Eres Grok 3 de Amazona Verse. Lee AGENTS.md, docs/equipo/RETOMAR.md, el final de docs/equipo/PEDIDOS.md y QA-53 en docs/equipo/BUGS.md. Tu tarea: (1) QA-53, la pantalla que se congela en el móvil al pulsar «Empezar» (el perfil de CPU está en BUGS.md); si necesitas tocar src/boot.js, que sea el cambio mínimo y dilo en el commit; (2) F2.2, que las 10 aldeas Savage se lean con sus tejados rojos desde el aire, como en el render de 2022; (3) las 3 o 4 piezas beige que flotan en la pared del tepuy (QA-28, vista `render2022`). No toques la ciudad del tepuy (Grok 1) ni la vegetación (Grok 2). Apúntate como «Grok 3» en docs/equipo/TRABAJO_SIMULTANEO.md. Con cada cambio visual sube su captura (vista `render2022`) en docs/img/ con la vista y la fecha. Commit solo de tus archivos (índice temporal) y `git pull --rebase` antes de cada push. Modo continuo. No publiques sitio/.

## Avisos
- Cada agente gasta del plan de Cursor.
- No abras dos agentes con la misma tarea.
- La sesión coordinadora de Claude en la web une el trabajo, lo prueba, lo revisa contra las referencias de Kelvin y lo publica. Si algo falla, lo deja en `PEDIDOS.md` para el Grok que corresponda.
- Nada visual se da por hecho sin que Kelvin lo vea.
