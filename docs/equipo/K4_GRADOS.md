# K4-01 · El campo `grados` de las lecciones: ¿llega a pantalla?

Tarea K4-01 (`docs/equipo/TAREAS_KIMI_NUBE.md`). Revisado sobre `main` @ `6b769a73` (2026-11-06).
Búsqueda: `grep -rn "grados\|grado\|3-6"` en `src/`, `content/`, `web/`, `index.html` y `tools/`.
No es una tarea de datos educativos: no hace falta citar fuentes externas.

## Resultado en una línea

El campo `grados` **no llega a pantalla en crudo**: el único sitio que lo lee lo traduce a «Nivel 1», «Nivel 2» o «Niveles 1 y 2».
**Sí** salen en crudo las etiquetas «3-4» y «5-6» (y la clave `apoyo_idioma`) en «Diferenciación», dentro de la pestaña Guía del Modo Maestro, en los 6 capítulos. Eso pide un parche de 1 línea en `src/game/aula.js` (más abajo).

## 1. Dónde está el campo

| Archivo | Campos `grados` |
|---|---|
| `content/cap1/lecciones.js` (se genera desde `assets/data/lecciones_cap1.json`, 12 apariciones allí) | `meta.grados` (l. 10); `objetivos[].grados` (l. 31, 41, 51, 62, 72, 82; la l. 41 vale `"3-6 (3-4: 3 eslabones; 5-6: 5 eslabones con descomponedor)"`); `actividades_sin_pantalla[].grados` (l. 482 `3-6`, 487 `3-5`, 492 `5-6`, 498 `3-6`, 504 `4-6`); también `pasos[p3].interaccion.grados_3_4` / `grados_5_6` (l. 179-180) |
| `content/ep2/lecciones.js` … `content/ep6/lecciones.js` | `meta.grados` (l. 12-16), `objetivos[].grados` (E1-E4 / F1-F4) y `actividades_sin_pantalla[].grados` (b1-b3); todos `"3-6"` |
| `content/plantilla/`, `content/comun/` | ninguno |

Campos relacionados, que tampoco se ven en crudo: `aj.grado` (`'3-4'` / `'5-6'`, ajuste del dispositivo), `partida.grado` (registro local), `diario[].grado` (filtro de fichas) y las claves `diferenciacion["3-4"]` / `["5-6"]`.

## 2. Quién lo lee (archivo:línea)

| Lector | Qué hace | ¿Llega a pantalla? |
|---|---|---|
| `src/game/aula.js:526` (`htmlGuia`) | `nivelDe(a.grados)` de cada actividad sin pantalla | Sí, **traducido**: «Nivel 1», «Nivel 2» o «Niveles 1 y 2». Ejemplos del cap. 1: `3-5` y `4-6` → «Niveles 1 y 2», `5-6` → «Nivel 2» |
| `meta.grados`, `objetivos[].grados` | **Nadie los lee** (ni en `src/`, `content/*/pack.js`, `tools/` ni `web/`) | No |
| `content/cap1/educativa.js:531`, `content/cap1/pruebas.js:668` | Eligen `interaccion.grados_3_4` o `grados_5_6` según `AU.aj.grado` | No (son claves internas) |
| `src/game/aula.js:232-236` (`rango`, `enGrado`, `nivelDe`) | Filtro de fichas del Diario por `f.grado`, y traducción a Nivel | Solo como «Nivel X» (`aula.js:582`, pestaña Fuentes) |
| `src/game/aula.js:544` (`htmlProgreso`) | `nivelDe(p.grado)` | Solo como «Nivel X» |
| `src/game/aula.js:403` (`exportable`, CSV y JSON) | Cambia `grado` por `nivel: nivelDe(grado)` | El archivo exportado dice «Nivel X», nunca «grado» |
| `src/game/aula.js:559-560` (selector) | Opciones «Nivel 1» / «Nivel 2» con valores internos `3-4` / `5-6` | Solo «Nivel» |
| **`src/game/aula.js:524`** (`htmlGuia`, diferenciación) | `<dt>${esc(k)}</dt>` con la **clave cruda** de `guia_45_min.diferenciacion` | **Sí, en crudo**: «3-4», «5-6» y «apoyo_idioma» |

Otras coincidencias que no son de este tema: los «grados» de ángulos en `src/engine/camara.js`, `fisica.js`, `src/pruebas/movimiento.js` y `tools/blender/*`; `web/escuelas.html:452` («Soy maestra/o de ___ grado…»: lo rellena el maestro en su correo de solicitud, no habla del público del juego); y `web/estado-06fc45c62200/index.html:316` («caps. 3 a 6»: son capítulos).

Las pruebas de cada capítulo (`content/ep2/pack.js:899`, `ep3:1027`, `ep4:761`, `ep5:936`, `ep6:1010`) comprueban que no aparezca la palabra «grado» en lo que ven el maestro y el niño. Pasan porque «3-4» no contiene esa palabra, así que no detectan el caso de la línea 524.

## 3. Lo que se ve hoy en la Guía → Diferenciación

- **Cap. 1:** `3-4` · «Cadena de 3 tarjetas, modo sin texto largo…»; `5-6` · «Cadena de 5 con descomponedores…»; `apoyo_idioma` · «Modo bilingüe…».
- **Caps. 2-6:** `3-4` · «Nivel 1: …»; `5-6` · «Nivel 2: …»; `apoyo_idioma` · … (el cap. 5 no tiene `apoyo_idioma`).

«3-4» y «5-6» al lado de una guía para el maestro se leen como grados escolares, y eso va contra la regla de Kelvin («Nivel 1» y «Nivel 2»). `apoyo_idioma` es una clave interna que se cuela en la pantalla.

## 4. Parche mínimo propuesto (NO aplicado)

Un solo cambio en `src/game/aula.js:524`. La etiqueta se calcula desde la clave, sin tocar los datos:

```diff
-    const dif = g.diferenciacion ? `<details><summary>${esc(m('dif'))}</summary><dl>${Object.entries(g.diferenciacion).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>` : '';
+    const difK = k => /^\d-\d$/.test(k) ? nivelDe(k) : k === 'apoyo_idioma' ? t({ es: 'Apoyo de idioma', en: 'Language support' }) : k;
+    const dif = g.diferenciacion ? `<details><summary>${esc(m('dif'))}</summary><dl>${Object.entries(g.diferenciacion).map(([k, v]) => `<dt>${esc(difK(k))}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>` : '';
```

- `nivelDe` ya existe en el mismo cierre (`aula.js:235`) y está definido antes de `htmlGuia`. Da `3-4` → «Nivel 1» y `5-6` → «Nivel 2».
- En los caps. 2-6 el texto empieza con «Nivel 1: …», así que la etiqueta saldría repetida («Nivel 1 / Nivel 1: …»). Es un detalle cosmético. Si se quiere evitar, en el mismo `map` se puede quitar el prefijo con `String(v).replace(/^Nivel \d:\s*/, '')`. Lo dejo como opción y no lo incluyo en el parche mínimo.
- Para que no vuelva a pasar, se puede añadir una prueba en `content/cap1/pruebas.js`. Abriría la Guía del Modo Maestro y comprobaría que el HTML no contenga `/\b[3-6]-[3-6]\b/` ni `apoyo_idioma`. No lo preparo para no salirme de los archivos de la tarea; queda a decisión de quien aplique el parche.
- Antes del commit: `build.sh` con salida propia y `test.sh --extra`, con las 13 baterías en verde.

## 5. Qué hacer con el campo `grados` (decide Kelvin)

Como no llega a pantalla en crudo, **cambiarlo no es urgente**. Hay tres opciones:

1. **Dejarlo como está (lo que recomiendo por ahora).** Es un dato interno, el código lo convierte siempre en «Nivel» y no hay riesgo. Solo hace falta el parche de la sección 4.
2. **Borrar lo que nadie lee:** `meta.grados` y `objetivos[].grados` en los 6 `lecciones.js`, y en `assets/data/lecciones_cap1.json` para el cap. 1, porque su `.js` se genera desde ese archivo. Ningún código los usa, así que el cambio es seguro. La nota de la l. 41 («3-4: 3 eslabones; 5-6: 5 eslabones…») ya está en `diferenciacion`. Los `grados` de `actividades_sin_pantalla` se mantienen porque `aula.js:526` los usa.
3. **Renombrar a nivel** en `actividades_sin_pantalla`: `"grados": "3-6"` pasaría a `"nivel": "1-2"`, `"3-5"` y `"4-6"` a `"1-2"`, y `"5-6"` a `"2"`. Habría que cambiar `aula.js:526` por `a.nivel` y escribir un `nivelDe` nuevo para la escala 1-2. **No lo recomiendo ahora.** Toca 6 archivos de datos más el JSON fuente, y `aj.grado` / `partida.grado` (`'3-4'` / `'5-6'`) ya están guardados en los dispositivos de las escuelas (`src/engine/guardado.js:572`). Cambiar esos valores rompería la compatibilidad, y es un cambio de modelo de datos que Kelvin tendría que aprobar.

Pendiente de Kelvin: elegir entre 1, 2 o 3, y aprobar el parche de la sección 4.
