# Política de conservación y eliminación de datos · BORRADOR

> Borrador del 5-nov-2026 (regla COPPA de 2025: política escrita de conservación). Lo marcado **[PENDIENTE]** lo decide Kelvin con el abogado; no se inventan plazos.

| Categoría | Dónde está | Finalidad | Plazo | Responsable | Cómo se elimina |
| --- | --- | --- | --- | --- | --- |
| Partida, progreso, Aula, criadero, récords locales, V18 | Navegador del jugador (`localStorage`) | Que el juego recuerde lo jugado | Mientras el usuario no lo borre; el equipo no tiene acceso | El usuario | «Nuevo estudiante» o borrar los datos del sitio |
| Aspecto del personaje en la sesión | `sessionStorage` | Mostrar el personaje | Hasta cerrar la pestaña | Automático | Al cerrar la pestaña |
| Archivos en la caché del service worker | Navegador | Cargar más rápido | Hasta la siguiente versión del sitio | Automático | Al actualizar el sitio o borrar datos |
| Apodo y código de aparato del ranking | Navegador (`.rankalias`, `.rankdisp`) | Ranking (apagado) | **[PENDIENTE]** | **[PENDIENTE]** | Borrar los datos del sitio |
| Récords en Supabase (`amazona.records`: hashes de aparato e IP, apodo, marca) | Servidor de Supabase | Ranking (apagado) | **[PENDIENTE]**; hoy indefinido | Fernando / Kelvin **[PENDIENTE]** | Borrar filas en el panel; propuesta: borrar o archivar ya mientras no haya revisión legal |
| Registros técnicos del alojamiento (IP, navegador) | Vercel | Servir el sitio y su seguridad | **[PENDIENTE]** según el plan de Vercel | Titular de la cuenta **[PENDIENTE]** | Según el proveedor |
| Registros de la función de Supabase | Supabase | Funcionamiento del servidor | **[PENDIENTE]** | Fernando **[PENDIENTE]** | Según el proveedor |

**Regla general propuesta:** no guardar en servidores ningún dato de un menor que no sea imprescindible para una función activada y aprobada, y borrarlo en cuanto deje de hacer falta.
