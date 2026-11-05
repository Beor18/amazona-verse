# Programa de seguridad de la información · BORRADOR

> Borrador del 5-nov-2026 (regla COPPA de 2025: programa escrito de seguridad). Describe lo que hay hoy y lo que falta. Lo marcado **[PENDIENTE]** lo completan Kelvin, Fernando y el abogado.

## 1. Control de accesos

- **Hoy:** el código está en GitHub (`Beor18/amazona-verse`); despliegan las sesiones coordinadoras con el token de Vercel; el servidor del ranking vive en el proyecto Supabase de Fernando.
- **Falta [PENDIENTE]:** lista de personas con acceso a GitHub, Vercel y Supabase; quitar accesos que ya no se usen; doble factor obligatorio en las tres cuentas.

## 2. Credenciales

- **Hoy:** regla del equipo (CLAUDE.md): nunca claves en archivos, mensajes ni documentos del repo; la clave de la API de la Mac sale del Llavero de macOS.
- **Falta [PENDIENTE]:** revisar el historial del repositorio en busca de claves antiguas y rotar las que aparezcan; guardar los tokens de despliegue solo en los secretos del entorno.

## 3. Bases de datos

- **Hoy:** una sola tabla con datos de jugadores (`amazona.records` en Supabase), con RLS activado y sin políticas, escrita solo por la función, con aparato e IP en hash con sal y límites de envío.
- **Falta [PENDIENTE]:** decidir qué hacer con las filas existentes; plazo de borrado automático; confirmar que la sal está en los secretos de la función y no en el código.

## 4. Gestión de incidentes

- **Falta [PENDIENTE]:** quién decide, cómo se apaga una función (el ranking ya tiene un interruptor), cómo se avisa a las familias y en qué plazo, y quién habla con el abogado. Propuesta: el primer paso ante cualquier sospecha es apagar la función afectada y conservar los registros.

## 5. Dependencias

- **Hoy:** las bibliotecas van dentro del sitio (sin CDN en el juego), con versiones fijas; las 12 baterías de pruebas revisan la red (0 peticiones a sitios no permitidos).
- **Falta [PENDIENTE]:** revisión periódica de vulnerabilidades de las bibliotecas (por ejemplo, cada trimestre).

## 6. Copias de seguridad y eliminación

- **Hoy:** el código tiene copia en GitHub; los datos de los jugadores están en sus aparatos.
- **Falta [PENDIENTE]:** si se activan funciones con servidor, definir copias y su borrado según la política de conservación.

## 7. Proveedores

- **Hoy:** Vercel (alojamiento) y Supabase (ranking, apagado).
- **Falta [PENDIENTE]:** guardar sus condiciones y acuerdos de tratamiento de datos, la región de los datos y el plazo de sus registros; revisarlos cada año.
