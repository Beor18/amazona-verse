# Análisis preliminar COPPA del expediente (5-nov-2026)

> **No es una opinión legal.** Lo trajo Kelvin el 5-nov como análisis informado («no soy abogado ni notario licenciado»). Antes de lanzar, un abogado admitido tiene que revisarlo y firmarlo. Expediente: `EXPEDIENTE_ABOGADO.md`.

## Resumen por pregunta del expediente

| # | Pregunta | Lectura preliminar | Qué pide confirmar al abogado |
|---|---|---|---|
| 1 | Código de aparato con hash y sal; ranking público | **Sí es información personal** (identificador persistente; el hash con sal no lo saca de la definición). La excepción de operaciones internas puede cubrir guardar récords y evitar fraude, pero la regla de 2025 exige un aviso en línea que diga qué operaciones internas y cómo se garantiza ese uso exclusivo. Un ranking público se acerca a «divulgación» y la excepción no la cubre. Solo sería defendible con apodo de listas fijas, sin texto libre, sin mostrar el código y sin forma de contactar. | Que firme expresamente si un ranking público así es posible sin consentimiento. |
| 2 | Apodo «Animal Adjetivo NN» de listas fijas | Por sí solo, probablemente no es información personal: no sirve de contacto. Dos condiciones: NN no puede salir de nada real (edad, fecha, número de lista), y el apodo unido en el servidor al código persistente sí es información personal. | Confirmar. |
| 3 | Filas de `amazona.records` | **Borrarlas**, también de los respaldos que lo permitan. Antes, documentar sin exportar el contenido: cuántas filas, rango de fechas y columnas. Guardar un acta de eliminación con fecha y responsable. | Que no haya reclamación ni requerimiento pendiente. |
| 4 | Registros técnicos (IP, navegador) de Vercel y Supabase | La IP es un identificador persistente. Para servir y proteger el sitio cabe en operaciones internas, pero hay que **declararlo**: nombrar a Vercel y Supabase, los propósitos y la retención. Apagar Web Analytics y Speed Insights. Retención mínima. Ningún uso de las IP fuera de seguridad y depuración. **Garantías escritas** de los proveedores (acuerdo de tratamiento de datos). Anotar la región de cada proveedor. | Confirmar la lista de configuración. |
| 5 | Consentimiento verificable si se activa el ranking o el juego en línea | Mejor diseñar para no necesitarlo: apodo fijo y récord de sesión que se borra, sin código persistente en el servidor. «Email plus» no vale si hay divulgación. Si hiciera falta consentimiento, contratar un proveedor de consentimiento verificable o un programa Safe Harbor aprobado por la FTC. | — |
| 6 | Aviso de privacidad aunque no se envíen datos | **Necesario**, por las IP. Debe incluir: operador (nombre, dirección, correo); qué no se pide; qué se recopila automáticamente y para qué operaciones internas; proveedores; conservación con plazos; derechos de los padres; fecha de vigencia y cómo se avisan los cambios. Enlace visible en la portada y dentro del juego. | Revisar el texto final. |
| 7 | Ranking de clase en el aparato del adulto | No necesita permiso bajo COPPA: el dato nunca llega al operador. Recomienda un aviso corto al crear la tabla: solo en este aparato, alias sin nombres completos ni fotos, se puede borrar, y siga las normas de su escuela. FERPA y las reglas del distrito son de la escuela. | — |
| 8 | Otras leyes | **California AADC:** desde el 12-mar-2026 el interdicto es más estrecho, pero solo aplica a quien califica como «business» bajo la CCPA, por umbrales que un juego gratis y pequeño probablemente no alcanza. **Otros estados:** umbrales parecidos. **RGPD:** exposición baja; el aviso debe cubrirlo. **Puerto Rico:** derecho constitucional a la intimidad (Art. II, Sec. 8) y ley de notificación de brechas. | Que el abogado local confirme Puerto Rico. |
| 9 | PvP online privado | Lista mínima: identificadores efímeros que se borran al acabar la partida; cero texto libre; nada que identifique salvo el apodo fijo; códigos de un solo uso que caducan; programa de seguridad activo con responsable y evaluación anual; revisión del proveedor de tiempo real; aviso actualizado. Si hay identidad persistente (amigos, historial), hace falta consentimiento. | — |

## Pendiente antes de publicar (veredicto práctico)

| Tarea | Quién | Estado |
|---|---|---|
| Borrar `amazona.records` con el procedimiento del punto 3 | Fernando, coordinado con Kelvin | **en espera (Kelvin, 5-nov): «estamos en etapa de pruebas, no quites nada de Supabase»**; se hace antes del lanzamiento público |
| Apagar Vercel Web Analytics y Speed Insights del dominio del juego | Kelvin / Fernando (panel de Vercel) | pendiente de Kelvin |
| Acuerdos de tratamiento de datos de Vercel y Supabase, con la región de cada uno | Kelvin | pendiente de Kelvin |
| Aviso con la sección de operaciones internas y la política de retención, enlazado en la portada y en el juego | Borrador: equipo. Publicación: Kelvin | borrador en curso |
| Programa de seguridad firmado, con responsable designado | Kelvin firma | borrador listo; falta nombre y firma |

Fuentes citadas en el análisis: Venable (ene-2025), Hunton, Mondaq, Loeb & Loeb (may-2025), Cooley (30-mar-2026), Alston & Bird.
