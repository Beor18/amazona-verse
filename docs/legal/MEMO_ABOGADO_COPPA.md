# Memorando · Privacidad infantil (COPPA) · BORRADOR para revisión de abogado

| | |
|---|---|
| **Para** | [PENDIENTE: nombre del abogado o bufete] |
| **De** | Equipo de Amazona Verse, por encargo de Kelvin García |
| **Fecha** | 5-nov-2026 |
| **Asunto** | Nueve preguntas COPPA del expediente: hechos comprobados en el código, lectura preliminar y lo que pedimos confirmar |

> No es una opinión legal ni una declaración de cumplimiento. Los hechos se comprobaron leyendo el código del repositorio el 5-nov-2026 (commit `713c44c6`, solo lectura). La lectura preliminar es la que trajo Kelvin (`ANALISIS_PRELIMINAR_COPPA_5NOV.md`), que no es abogado. Operador: [PENDIENTE: Kelvin — nombre legal de la LLC, dirección y correo]. Anexos: `EXPEDIENTE_ABOGADO.md`, `AUDITORIA_DATOS.md`, `MAPA_FLUJO_DATOS.md` y los tres borradores de aviso, conservación y seguridad.

## 1. Código de aparato y ranking público

**Hechos.** Si el ranking se encendiera, el juego crearía un código al azar de 128 bits (`src/game/records.js:718-724`, `crypto.getRandomValues`), lo guardaría en el navegador (`.rankdisp`) y lo enviaría **sin hash** junto con el apodo y la marca (`records.js:780-781`). El hash lo calcula el servidor: SHA-256 con sal del código y de la IP tomada de `x-forwarded-for` (`tools/supabase/amazona-records/index.ts:69-73`). **La sal está escrita en el código** (`index.ts:8`) de un repositorio público, así que el hash de la IP (espacio IPv4 pequeño) se podría revertir por fuerza bruta. El texto que vería el niño dice «No se guarda nada personal: solo el apodo y tu marca» (`records.js:95`), lo que no describe los hashes que se guardan.
**Lectura preliminar.** Es información personal (identificador persistente; el hash no lo saca de la definición). Las operaciones internas pueden cubrir guardar récords y evitar fraude si el aviso las declara. Un ranking público se acerca a «divulgación» y la excepción no lo cubre.
**Se pide confirmar:** si un ranking público con apodo de listas fijas, sin texto libre, sin mostrar el código y sin contacto es posible sin consentimiento parental verificable.

## 2. Apodo «Animal Adjetivo NN»

**Hechos.** Animal y adjetivo salen de dos listas fijas de 10 (`records.js:712-713`). La propuesta inicial es al azar: `NN = 1 + Math.floor(Math.random() * 99)` (`records.js:727`). Pero el niño **puede elegir el número a mano** en un desplegable del 1 al 99 (`records.js:738`, `:747`, `:758`), y el servidor acepta cualquier número de 1 a 99 (`index.ts:23`). El código no saca NN de la edad, la fecha ni una lista de clase, pero nada impide que el niño elija su edad o su número de lista.
**Lectura preliminar.** Solo, probablemente no es información personal, con dos condiciones: que NN no salga de nada real y que no se una en el servidor al código persistente.
**Se pide confirmar:** si basta con el número al azar o hay que quitar la elección manual (cambio de código que decide Kelvin).

## 3. Filas existentes en `amazona.records`

**Hechos.** La tabla guarda reto, marca, duración, apodo, hash del aparato, hash de la IP y fecha (`tools/supabase/migracion.sql`); no hay borrado automático. Desde aquí no se puede ver cuántas filas hay (requiere el panel de Supabase).
**Decisión de Kelvin (5-nov):** el proyecto está en etapa de pruebas y **no se borra ni se cambia nada en Supabase** por ahora, para no romper la configuración de Fernando. El borrado queda **pendiente para antes del lanzamiento público, coordinado con Fernando**.
**Lectura preliminar.** Borrarlas, también de los respaldos que lo permitan, tras documentar sin exportar el contenido (número de filas, rango de fechas, columnas) y con un acta de eliminación. Procedimiento en `POLITICA_CONSERVACION_BORRADOR.md`.
**Se pide confirmar:** que no hay reclamación ni requerimiento que obligue a conservarlas, y si es aceptable mantenerlas hasta el lanzamiento público con el ranking apagado.

## 4. Registros técnicos de Vercel y Supabase

**Hechos.** No hay código de Vercel Web Analytics ni Speed Insights: la búsqueda de `/_vercel/insights`, `@vercel/analytics`, `speed-insights` e `insights` en `web/`, `sitio/`, `index.html` y `src/` no da resultados. No hay `vercel.json` en la raíz; `sitio/vercel.json` (generado por `tools/build/sitio.sh:21`) solo pone caché y las cabeceras `nosniff` y `strict-origin-when-cross-origin`. El panel de Vercel no se ha podido revisar.
**Lectura preliminar.** La IP es un identificador persistente; para servir y proteger el sitio cabe en operaciones internas si se declara (proveedores, propósitos, retención). Apagar Web Analytics y Speed Insights en el panel, retención mínima, garantías escritas de los proveedores y región anotada.
**Se pide confirmar:** la lista de configuración y el texto de operaciones internas del aviso.

## 5. Consentimiento verificable si se activa el ranking o el juego en línea

**Hechos.** Hoy no se activa: `publicarRanking` devuelve `'desactivado'` antes de tocar la red (`records.js:804`) y nada en `src/`, `web/` ni `tools/` asigna `G.RANKING_EN_LINEA = true`. La página `web/ranking.html` sale en `:48-49` antes de su único `fetch` a Supabase (`:65`, un GET del top que no lleva el código pero sí expone la IP a Supabase). Si se encendiera, enviarían datos `records.js` (POST) y `web/ranking.html` (GET); mostrarían el botón `retos.js:737`, `flight.js:558` y `river_rush.js:788`. El formulario de contacto de la portada solo envía si `formulario` tiene valor (`web/assets/js/web.js:177`), y está vacío (`web/cotorra.html:219`).
**Lectura preliminar.** Diseñar para no necesitarlo (apodo fijo, récord de sesión que se borra, sin código persistente en el servidor). Si hiciera falta, un proveedor de consentimiento verificable o un programa Safe Harbor aprobado por la FTC; «email plus» no vale si hay divulgación.
**Se pide confirmar:** el diseño mínimo que evitaría el consentimiento, o el mecanismo recomendado.

## 6. Aviso de privacidad

**Hechos.** Todo lo del juego se guarda en el navegador (`AUDITORIA_DATOS.md` §3). Lo único que llega a un tercero hoy son las peticiones normales a Vercel (IP, navegador). El aviso está en borrador y aún no se enlaza en la portada ni en el juego.
**Lectura preliminar.** Necesario por las IP, con operador, lo que no se pide, lo automático y para qué, proveedores, plazos, derechos de los padres, vigencia y cambios. Enlace en la portada y dentro del juego.
**Se pide confirmar:** el texto de `AVISO_PRIVACIDAD_PADRES_BORRADOR.md` y dónde enlazarlo.

## 7. Ranking de clase en el aparato del adulto

**Hechos.** Vive solo en el `localStorage` del adulto y la prueba automática falla si sale cualquier petición, beacon o WebSocket (`src/game/ranking_clase.js:340-351`). Borrar y reiniciar piden la puerta de adulto (`:146`, `:368`). El aviso (`:46`, se muestra en `:263`) dice «Solo en este aparato», «Nada se envía a ningún servidor» y «nunca nombres completos ni fotos», pero **no dice** que se puede borrar ni que se sigan las normas de la escuela (texto propuesto en el informe de la tarea; el código no se tocó).
**Lectura preliminar.** No necesita permiso bajo COPPA porque el dato no llega al operador. Recomienda el aviso corto completo. FERPA y las reglas del distrito son de la escuela.
**Se pide confirmar:** el texto del aviso corto.

## 8. Otras leyes

**Hechos.** Sin cuentas, publicidad ni analítica (`AUDITORIA_DATOS.md` §6). Juego gratis. [PENDIENTE: Kelvin — ingresos y volumen de jugadores, para los umbrales.]
**Lectura preliminar.** California AADC/CCPA probablemente no aplica por umbrales; otros estados parecidos; RGPD de baja exposición, que el aviso cubra; Puerto Rico: intimidad (Const. Art. II, Sec. 8) y ley de notificación de brechas.
**Se pide confirmar:** Puerto Rico (abogado local) y si el aviso debe tener una sección para la UE.

## 9. PvP online privado

**Hechos.** No existe código de PvP en línea ni de chat (`EXPEDIENTE_ABOGADO.md`, estado de funciones).
**Lectura preliminar.** Identificadores efímeros, cero texto libre, solo apodo fijo, códigos de un uso que caducan, programa de seguridad activo con responsable y evaluación anual, revisión del proveedor de tiempo real y aviso actualizado. Con identidad persistente (amigos, historial) hace falta consentimiento.
**Se pide confirmar:** la lista antes de diseñar.

## Pendientes antes de publicar (decide Kelvin)

1. Antes del lanzamiento público, coordinado con Fernando: borrar `amazona.records` con el procedimiento y el acta (irreversible). Hoy no se toca Supabase (decisión de Kelvin, 5-nov, etapa de pruebas).
2. Apagar Web Analytics y Speed Insights en el panel de Vercel y anotar la retención de registros de cada plan.
3. Pedir y guardar los acuerdos de tratamiento de datos de Vercel y Supabase, con la región.
4. Completar operador, correo y fecha de vigencia del aviso; enlazarlo en la portada y en el juego tras la revisión.
5. Firmar el programa de seguridad con responsable designado.
6. Antes de cualquier reactivación del ranking: sal fuera del código (secreto de la función) o eliminar el hash de IP, quitar la elección manual de NN y corregir el texto de `records.js:95`.
7. Completar el aviso corto del ranking de clase.
