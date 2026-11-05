# Expediente para el abogado de privacidad infantil (COPPA) · Amazona Verse

Preparado el 5-nov-2026 por la sesión coordinadora a pedido de Kelvin García («Directiva de privacidad infantil»). Es una revisión técnica, **no** una declaración de cumplimiento. Pedimos al abogado que determine los requisitos aplicables y cualquier mecanismo de consentimiento verificable necesario.

## Contenido

1. [Auditoría técnica de datos](AUDITORIA_DATOS.md): qué se pide, qué se guarda, Vercel y Supabase, con evidencia y estado.
2. [Mapa de flujo de datos](MAPA_FLUJO_DATOS.md).
3. [Aviso de privacidad para padres (borrador)](AVISO_PRIVACIDAD_PADRES_BORRADOR.md).
4. [Política de conservación y eliminación (borrador)](POLITICA_CONSERVACION_BORRADOR.md).
5. [Programa de seguridad (borrador)](PROGRAMA_SEGURIDAD_BORRADOR.md).
6. Diseño del ranking futuro y del multijugador futuro (abajo).
7. Contratos y configuraciones de proveedores: **[PENDIENTE: condiciones de Vercel y Supabase, plan contratado, región, acuerdos de tratamiento de datos]**.

## Estado de las funciones (decisión 1 de Kelvin)

| Función | Estado |
| --- | --- |
| Ranking público online | DESACTIVADO (código conservado) |
| Envío de récords con identificadores persistentes | DESACTIVADO |
| Chat entre jugadores | No existe |
| Cuentas infantiles | No se implementan |
| Analítica de comportamiento infantil | No existe |
| Publicidad personalizada | No existe |
| PvP online público | No existe |
| Combate contra IA, colección, poderes, construcción, guardados locales | En desarrollo, todo en el aparato |

## Diseño del ranking de clase (decisión 4, prototipo aprobado)

Sin servidor ni sincronización. Un adulto (maestro o padre) crea una tabla en **su propio aparato** e introduce a mano las marcas que los niños le enseñan en su pantalla de «Mis récords». Usa alias locales, nunca nombres completos ni fotos, y la tabla se puede borrar o reiniciar. Antes de usarlo en una escuela se revisan sus procedimientos de privacidad.

## Diseño del multijugador futuro (decisión 5)

Partidas privadas, sin chat libre, sin publicar información personal, con controles para menores, mínimos identificadores, retención limitada, control de acceso y revisión de proveedores. Un código privado de partida **no** sustituye el consentimiento parental cuando la ley lo exija.

## Preguntas para el abogado

1. ¿El código de aparato al azar (aunque el servidor lo guarde como hash con sal) es «información personal» bajo COPPA, o entra en la excepción de soporte de operaciones internas? ¿Y un ranking público?
2. ¿Un apodo compuesto de listas fijas («Animal Adjetivo NN»), sin texto libre, cuenta como información personal?
3. ¿Qué hacer con las filas que ya existan en `amazona.records`: borrarlas, archivarlas o conservarlas?
4. ¿Los registros técnicos de Vercel y Supabase (IP, navegador) imponen obligaciones bajo COPPA para un sitio dirigido a niños? ¿Qué debemos configurar?
5. ¿Qué mecanismo de consentimiento verificable conviene para un juego web gratuito sin cuentas, si en el futuro se activa el ranking o el juego en línea?
6. ¿Qué debe decir el aviso de privacidad cuando el juego no envía datos de los niños? ¿Dónde debe mostrarse (portada, juego, ambos)?
7. ¿El ranking de clase manual en el aparato del adulto necesita algún aviso o permiso?
8. ¿Aplican otras leyes por la audiencia (California AADC/CCPA, Europa/RGPD-K) si llegan jugadores de fuera de Puerto Rico?
9. ¿Qué requisitos cumplir antes de un PvP online privado (partidas con código, sin chat)?

## Fuentes legales consultadas

- Regla final de COPPA, Federal Register, 22-abr-2025: <https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule> (vigente desde el 23-jun-2025; cumplimiento obligatorio desde el 22-abr-2026).
- FTC, anuncio de la regla final (ene-2025): <https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data>.
- FTC, preguntas frecuentes de COPPA: <https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions>.
