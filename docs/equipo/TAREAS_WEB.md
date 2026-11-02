# TAREAS_WEB · lista permanente del agente web (Claude, cuenta cryptochefpr)

**Lee este archivo siempre al empezar o al retomar.** La coordinadora de la nube lo mantiene al día; toma la **primera tarea libre** de la tabla.

**Crédito justo (Kelvin, 2-nov: queda poco, hay que aprovecharlo):**
- Tareas pequeñas, una batería de pruebas cada una.
- Un commit y un push por arreglo, así no se pierde nada si se acaba la cuota a mitad.
- Antes de cada tarea, `git pull --rebase origin main`. Al terminar, `git push origin HEAD:main`; si no te deja, `HEAD:api-web`.
- Marca aquí `EN CURSO · web · hora` al empezar y `hecha · <commit> · una línea` al terminar, en un commit solo de este archivo.

**No toques (son de otros ahora mismo):**
- Lo gráfico: `src/engine/terreno.js`, `streaming.js`, `vegetacion.js`, `renderer.js`, `solidos.js`, `src/game/look.js`, edificios. Es de Kimi.
- `src/engine/actores.js`, `src/personaje/character.js`, `camara.js`, `fx.js` y `audio.js`.
- `src/game/criadero.js`, `comic.js`, `bandada.js`, `diario.js`, `zonas.js`.
- La lógica de misiones de `content/ep5/pack.js` (estaciones y voces).
- `sitio/`, y Vittata (modelo y rig).

## Tabla (en orden)

| Id | Estado | Tarea | Archivos | Hecha cuando |
|---|---|---|---|---|
| W1 | hecha · 4bdb7b1 · QA-87, QA-88 (d058236) y QA-95: «Jump», gestos, verbos de Acción y chips; idiomaTest 31/31, ep3e2e 55/55, ep4e2e 47/47, ep6e2e 53/53, ep5e2e sin texto en español (solo QA-86) | **Inglés, ronda completa: QA-87, QA-88 y QA-95** (`docs/equipo/BUGS.md`). <br>• Chips de misión de los caps. 3 a 6 con «· » y «✓ ». <br>• «Acción: {}» traducido entero. <br>• El botón de saltar debe decir **«Jump»**, no «Skip» (`content/cap1/en.js:878`). <br>• Traducir «Impulso», «Hablar», «Pausa», «PLUMAJE», «Arrastrar», los nombres de los gestos y los chips del cap. 5. | `src/game/idioma.js`, `content/*/en.js` | idiomaTest 31/31 y ep3e2eTest a ep6e2eTest sin «texto en español» |
| W2 | hecha · 5aefe785 · líneas revisadas, todas con EN; dos retoques (Nayara «Los botes yo los manejo», Vittata «Está bien»); ep3 63/63, ep6 72/72 | **Revisar las líneas nuevas de la historia (2-nov) en ES y EN:** Nayara (cap. 3), Villa Mangle (caps. 3 y 4), Mara y Vela (caps. 5 y 6) y la medalla del Guardián (cap. 6). Que se lean bien para niños, sin erratas, y que el inglés sea natural. **Sin cambiar el sentido ni el canon.** | `content/ep3`…`ep6/pack.js` (solo líneas de diálogo) y `en.js` | ep3Test a ep6Test en verde |
| W3 | EN CURSO · web · 15:16 | **QA-93: avisos encima de una tarjeta.** Si salta un aviso mientras hay una tarjeta a pantalla completa abierta (Diario, Retos, creador, cómic), que espere a que se cierre y salga después. | `src/engine/ui.js` (la parte de los avisos) | selfTest y accesibilidadTest en verde, y una comprobación nueva |
| W4 | libre | **Marcas `[KELVIN` ya resueltas.** Busca en `content/ep2`…`ep6` las marcas que ya contestan `docs/DECISION_LOG.md` y `docs/CANON_REGISTRY.md` (2-nov: Guardián, Mara y Vela, Nayara, Villa Mangle, asamblea, seis visitantes, medalla). Cámbialas por una nota «Kelvin 2-nov: …». Deja las que siguen abiertas y las que piden las pruebas. | `content/ep2`…`ep6` (solo comentarios y notas) | ep2Test a ep6Test en verde |
| W5 | libre | **Textos que se cortan a 375 px** con letra «Grande» y «Muy grande», en los caps. 2 a 6: diálogos, Diario, misiones y Retos. Solo CSS. | `src/ui/*.css` | accesibilidadTest en verde y capturas de antes y después |
| W6 | libre | **QA-85:** el «No» intermitente de ep2e2eTest en inglés en móvil. Localiza qué bocadillo lo dice y tradúcelo. | `content/ep2/*.js`, `en.js` | ep2e2eTest 71/71 tres veces seguidas en móvil EN |

Cuando termines la tabla, **sigue sin parar** con los bugs no gráficos abiertos de `docs/equipo/BUGS.md`, de prioridad media a baja: uno por commit, cada uno con su prueba.
