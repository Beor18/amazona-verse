# Política de conservación y eliminación de datos · BORRADOR

> Borrador del 5-nov-2026 **para revisión de abogado** (regla COPPA de 2025: política escrita de conservación). No es una declaración de cumplimiento. Lo marcado **[PENDIENTE]** lo decide Kelvin con el abogado; no se inventan plazos.

Operador: [PENDIENTE: Kelvin — nombre legal de la LLC, dirección y correo].

| Categoría | Dónde está | Finalidad | Plazo | Responsable | Cómo se elimina |
| --- | --- | --- | --- | --- | --- |
| Partida, progreso, Aula, criadero, récords locales, V18 | Navegador del jugador (`localStorage`) | Que el juego recuerde lo jugado | Mientras el usuario no lo borre; el equipo no tiene acceso | El usuario | «Nuevo estudiante» o borrar los datos del sitio |
| Aspecto del personaje en la sesión | `sessionStorage` | Mostrar el personaje | Hasta cerrar la pestaña | Automático | Al cerrar la pestaña |
| Archivos en la caché del service worker | Navegador | Cargar más rápido | Hasta la siguiente versión del sitio | Automático | Al actualizar el sitio o borrar datos |
| Apodo y código de aparato del ranking | Navegador (`.rankalias`, `.rankdisp`); solo existen si alguien abrió el panel cuando el ranking estaba activo | Ranking (apagado) | Mientras el usuario no lo borre | El usuario | Borrar los datos del sitio |
| Récords en Supabase (`amazona.records`: hashes de aparato e IP, apodo, marca) | Servidor de Supabase | Ranking (apagado) | Se conservan durante la etapa de pruebas (decisión de Kelvin, 5-nov: no se toca Supabase). **Borrar antes del lanzamiento público, coordinado con Fernando** | Fernando, con aprobación de Kelvin | Procedimiento abajo, con acta |
| Registros técnicos del alojamiento (IP, navegador, hora, ruta) | Vercel | Servir el sitio, seguridad y depuración | La retención **mínima** del plan contratado: [PENDIENTE: confirmar en el panel el plan y su plazo] | Titular de la cuenta [PENDIENTE: Kelvin] | Caducan solos según el plan; no se exportan |
| Registros de la función y de la base de datos (IP, peticiones) | Supabase | Funcionamiento y seguridad del servidor | La retención **mínima** del plan contratado: [PENDIENTE: confirmar en el panel el plan y su plazo] | [PENDIENTE: Kelvin] | Caducan solos según el plan; no se exportan |
| Analítica del proveedor (Web Analytics, Speed Insights) | Vercel | Ninguna: debe estar apagada | No se recopila | [PENDIENTE: Kelvin — confirmar en el panel] | Apagarla en el panel |

**Reglas para los registros técnicos:** se usan solo para seguridad y depuración; no se descargan ni se cruzan con otros datos; solo los consultan las personas autorizadas del programa de seguridad; si un plan permite elegir el plazo, se elige el más corto que deje investigar un incidente. Cada año se vuelve a comprobar el plazo de cada plan y se anota aquí con la fecha.

## Procedimiento de borrado de `amazona.records` (punto 3 del análisis)

**Cuándo:** pendiente para **antes del lanzamiento público, coordinado con Fernando**. No es una acción inmediata: durante la etapa de pruebas no se borra ni se cambia nada en Supabase, para no romper su configuración (decisión de Kelvin, 5-nov).

Lo ejecuta Fernando (o quien tenga acceso al proyecto de Supabase), con la aprobación de Kelvin. Es **irreversible**.

1. **Comprobar** con el abogado que no hay reclamación ni requerimiento que obligue a conservar los datos.
2. **Documentar sin exportar el contenido:** número de filas (`select count(*)`), primera y última fecha (`select min(creado), max(creado)`) y lista de columnas. No se copian apodos, hashes ni marcas a ningún sitio.
3. **Borrar** las filas de la tabla (`delete from amazona.records;` o `truncate`).
4. **Respaldos:** revisar en el panel qué copias de seguridad o recuperación a un punto en el tiempo existen y borrar o dejar caducar las que contengan esas filas, en la medida en que el proveedor lo permita. Anotar el plazo en que caducan las que no se puedan borrar.
5. **Verificar** que `select count(*)` devuelve 0.
6. **Decidir** si se apaga o elimina la función `amazona-records` [PENDIENTE: Kelvin].
7. **Acta de eliminación**, guardada con los documentos legales (no en el repo público si incluye datos de la cuenta):

| Campo | Valor |
|---|---|
| Fecha y hora | [ ] |
| Responsable que ejecutó | [ ] |
| Aprobó | Kelvin García |
| Filas borradas | [ ] |
| Rango de fechas de las filas | [ ] |
| Columnas | id, reto, valor, dur_ms, alias, dispositivo (hash), ip (hash), oculto, creado (según `tools/supabase/migracion.sql`) |
| Respaldos afectados y su caducidad | [ ] |
| Verificación (conteo final 0) | [ ] |
| Función apagada o eliminada | [ ] |

**Regla general propuesta:** no guardar en servidores ningún dato de un menor que no sea imprescindible para una función activada y aprobada, y borrarlo en cuanto deje de hacer falta.
