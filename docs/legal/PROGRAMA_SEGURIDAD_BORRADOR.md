# Programa de seguridad de la información · BORRADOR

> Borrador del 5-nov-2026 **para revisión de abogado** (regla COPPA de 2025: programa escrito de seguridad). No es una declaración de cumplimiento. Describe lo que hay hoy y lo que falta. Lo marcado **[PENDIENTE]** lo completan Kelvin, Fernando y el abogado.

Operador: [PENDIENTE: Kelvin — nombre legal de la LLC, dirección y correo].

## 0. Responsable designado

- **Responsable del programa:** [PENDIENTE: Kelvin — nombre y cargo de la persona designada]. Coordina el programa, guarda sus documentos, decide en un incidente y es el contacto con el abogado.
- **Suplente:** [PENDIENTE: Kelvin].
- **Firma y fecha de aprobación:** [PENDIENTE: Kelvin].

## 1. Control de accesos

- **Hoy:** el código está en GitHub (`Beor18/amazona-verse`); despliegan las sesiones coordinadoras con el token de Vercel; el servidor del ranking vive en el proyecto Supabase de Fernando.
- **Falta [PENDIENTE]:** lista de personas con acceso a GitHub, Vercel y Supabase; quitar accesos que ya no se usen; doble factor obligatorio en las tres cuentas.

## 2. Credenciales

- **Hoy:** regla del equipo (CLAUDE.md): nunca claves en archivos, mensajes ni documentos del repo; la clave de la API de la Mac sale del Llavero de macOS.
- **Falta [PENDIENTE]:** revisar el historial del repositorio en busca de claves antiguas y rotar las que aparezcan; guardar los tokens de despliegue solo en los secretos del entorno.

## 3. Bases de datos

- **Hoy:** una sola tabla con datos de jugadores (`amazona.records` en Supabase), con RLS activado y sin políticas, escrita solo por la función, con aparato e IP en hash con sal y límites de envío.
- **Hallazgo (5-nov, lectura del código):** la sal está escrita en el código de la función (`tools/supabase/amazona-records/index.ts:8`), en un repositorio público. Con la sal conocida, el hash de una IPv4 se puede revertir probando todas las direcciones. No afecta mientras el ranking siga apagado.
- **Falta [PENDIENTE]:** borrar las filas existentes antes del lanzamiento público, coordinado con Fernando (hoy no se toca Supabase, decisión de Kelvin del 5-nov); plazo de borrado automático; antes de reactivar, mover la sal a los secretos de la función o dejar de guardar el hash de la IP.

## 4. Gestión de incidentes

- **Falta [PENDIENTE]:** quién decide (propuesta: el responsable designado), cómo se apaga una función (el ranking ya tiene un interruptor), cómo se avisa a las familias y en qué plazo (incluida la ley de notificación de brechas de Puerto Rico, a confirmar con el abogado), y quién habla con el abogado. Propuesta: el primer paso ante cualquier sospecha es apagar la función afectada y conservar los registros.

## 5. Dependencias

- **Hoy:** las bibliotecas van dentro del sitio (sin CDN en el juego), con versiones fijas; las baterías de pruebas revisan la red (0 peticiones a sitios no permitidos).
- **Falta [PENDIENTE]:** revisión periódica de vulnerabilidades de las bibliotecas (por ejemplo, cada trimestre).

## 6. Copias de seguridad y eliminación

- **Hoy:** el código tiene copia en GitHub; los datos de los jugadores están en sus aparatos.
- **Falta [PENDIENTE]:** si se activan funciones con servidor, definir copias y su borrado según la política de conservación.

## 7. Proveedores y garantías escritas

| Proveedor | Función | Garantía escrita (acuerdo de tratamiento de datos) | Región | Retención de registros | Revisado |
|---|---|---|---|---|---|
| Vercel | Alojamiento del sitio | [PENDIENTE: Kelvin — obtener, aceptar y guardar] | [PENDIENTE] | [PENDIENTE: confirmar en el panel] | [ ] |
| Supabase | Servidor del ranking (apagado) | [PENDIENTE: Kelvin — obtener, aceptar y guardar] | [PENDIENTE] | [PENDIENTE: confirmar en el panel] | [ ] |

Cada garantía escrita debe cubrir, como mínimo: que el proveedor trata los datos solo según nuestras instrucciones y para prestar el servicio; confidencialidad y medidas de seguridad; aviso de brechas; subencargados; y borrado o devolución al terminar el servicio. [PENDIENTE: abogado — confirmar el contenido mínimo.] Antes de añadir un proveedor nuevo (por ejemplo, de tiempo real para un PvP), se revisa con esta misma tabla.

## 8. Evaluación anual de riesgos

Una vez al año, y además antes de activar cualquier función que envíe datos al servidor, el responsable designado:

1. Repasa qué datos de jugadores pasan por servidores (actualiza `AUDITORIA_DATOS.md` y `MAPA_FLUJO_DATOS.md`).
2. Identifica riesgos internos y externos (accesos, credenciales, proveedores, dependencias, cambios de código) y la probabilidad e impacto de cada uno.
3. Revisa que las medidas de este programa siguen funcionando: lista de accesos, doble factor, pruebas de red, interruptores.
4. Revisa las garantías escritas y la retención de cada proveedor (sección 7).
5. Anota resultados, cambios y fecha en este documento, con su firma.

| Fecha | Responsable | Resultado y cambios |
|---|---|---|
| [PENDIENTE: primera evaluación] | [ ] | [ ] |
