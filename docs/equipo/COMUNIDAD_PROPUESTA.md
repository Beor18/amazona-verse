# COMUNIDAD_PROPUESTA · «La Comunidad de Amazona Verse» (sección web)

Propuesta breve, 2026-10-25, para la landing (`web/`). Nada implementado. Fuente de reglas: `docs/equipo/SEGURIDAD_INFANTIL.md` y la directiva V8.0 de Kelvin.

## 1. Objetivos
Que familias, docentes y jugadores aporten al juego sin que ningún menor quede expuesto:
- **sugerencias** sobre el juego;
- **proponer accesorios** para el ropero (dibujo o descripción);
- **ideas de misiones** y de lugares de Puerto Rico que deberían salir;
- **comentarios de familias** y docentes sobre cómo lo juegan en casa o en clase;
- **encuestas** cortas (una pregunta, opciones cerradas);
- **desafíos creativos** (p. ej. «dibuja la cotorra de tu pueblo»), con una galería curada.

## 2. Arranque: solo un formulario moderado
Una página «Comunidad» con un único formulario, sin cuenta ni inicio de sesión:
- **Quién envía:** un adulto (madre, padre, tutor o docente). Casilla obligatoria «Soy mayor de 18 y envío esto en nombre de mi familia o mi clase». Las ideas de los niños llegan a través del adulto.
- **Campos:** tipo (sugerencia · accesorio · misión · comentario · encuesta · desafío), texto, y un archivo opcional **solo de dibujos** (nunca fotos de personas). Correo **opcional**, solo si el adulto quiere respuesta.
- **No se pide nunca:** nombre, edad, escuela ni pueblo del menor; redes sociales; teléfono.
- **Filtro al enviar:** la misma regla de `src/game/creador.js` `textoSeguro` (sin números de teléfono, enlaces ni «me llamo…») y aviso de «no incluyas datos de niños».
- **Qué pasa después:** todo entra a una cola privada. Kelvin (o un moderador) lee, responde si hay correo y, como mucho, publica una selección en una página estática «Lo que la comunidad propuso», sin nombres (solo «una familia de Caguas», «una clase de 4.º») y solo con permiso explícito del adulto.
- **Encuestas:** la misma página muestra una pregunta al mes con opciones cerradas; el resultado se publica como porcentaje, sin respuestas individuales.
- **Backend:** el formulario de contacto con backend real ya está en el roadmap; usar el mismo. **[KELVIN]** el proveedor (formulario del hosting o servicio aparte) y dónde se guardan los envíos.

## 3. Prohibido (desde el primer día y sin excepción)
- Chat abierto o salas, en la web o en el juego.
- Mensajes privados entre usuarios.
- Publicación automática de cualquier envío (todo pasa por una persona).
- Perfiles públicos de menores: ni nombre, ni avatar con datos, ni «mi cómic» público con nombre real. Si un día se muestra un cómic, es con nombre de aventurero de las listas y permiso del adulto.
- Comentarios bajo las publicaciones, «me gusta» y rankings públicos.
- Fotos de personas en los desafíos creativos.

## 4. Requisitos antes de pensar en un foro
**Privacidad (COPPA y buenas prácticas):**
- Política de privacidad y aviso para familias publicados en la web, en español e inglés, con qué se recoge, para qué y cuánto tiempo (propuesta: 90 días para lo no publicado; lo publicado, anonimizado).
- Ningún dato personal de menores de 13 sin consentimiento parental verificable; la forma más simple es **no recogerlo**: por eso el formulario es de adultos.
- Correo opcional, borrado tras responder; sin boletines sin consentimiento aparte.
- Revisión legal (la misma persona que lleva el Reglamento 5282 de la bandera) antes de publicar la sección.
- Hoja para familias con la política y opción de no participar (`SEGURIDAD_INFANTIL.md`, punto 6).

**Moderación:**
- Reglas escritas y públicas (qué se publica, qué no, cómo se retira algo).
- Una persona responsable con nombre y un plazo de respuesta (p. ej. 7 días).
- Dos ojos antes de publicar cualquier texto o dibujo; registro de qué se publicó y con qué permiso.
- Un canal para pedir que se retire un contenido, atendido en 48 h.

**Un foro solo si, además:** hay moderadores con horario, una plataforma que cumpla COPPA con verificación de edad y consentimiento parental, términos de uso revisados por el abogado, y una decisión de Kelvin de que vale el costo. Mientras tanto, la recomendación es **no abrir foro**: el formulario moderado cubre los seis objetivos.

## 5. Fases
| Fase | Qué | Requisito |
|---|---|---|
| 1 | Página «Comunidad» con el formulario moderado y la política de privacidad | Backend del formulario; texto legal revisado |
| 2 | «Lo que la comunidad propuso»: selección anónima y encuesta del mes | 20 envíos leídos; reglas de moderación publicadas |
| 3 | Desafío creativo trimestral con galería de dibujos (sin personas) | Permiso del adulto por cada dibujo publicado |
| — | Foro | No por ahora (sección 4) |

**[KELVIN]** proveedor del formulario, persona moderadora, plazo de retención y si la selección publicada lleva el nombre del pueblo o solo «una familia».
